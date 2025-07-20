package ec2

import (
	"context"
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

var OS_REMAP = map[string]string{
	"Windows": "mswin",
	"Linux":   "linux",
}

var R_VALUES_MAPPING = []string{
	"<5%", "5-10%", "10-15%", "15-20%", ">20%",
}

func getSpotDataPartial() *spotDataPartial {
	var spotData spotDataPartial
	err := awsutils.FetchDataFromAWSWebsite(
		"https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json",
		&spotData,
	)
	if err != nil {
		log.Fatalln("Failed to fetch spot data", err)
	}
	return &spotData
}

func processSpotInterruptData(region string, os string, instance *EC2Instance, s int, r int, china bool) {
	remap, ok := OS_REMAP[os]
	if !ok {
		if !china {
			log.Default().Println("WARNING: Spot interrupt data has unknown OS", os)
		}
		return
	}

	if r > len(R_VALUES_MAPPING) {
		log.Default().Println("WARNING: Spot interrupt data has unknown R value", r, "for", instance.InstanceType)
		return
	}
	rValue := R_VALUES_MAPPING[r]

	regionMap := instance.Pricing[region]
	if regionMap == nil {
		if !china {
			log.Default().Println("WARNING: Spot interrupt data has unknown region", region, "for", instance.InstanceType)
		}
		return
	}

	osResult, ok := regionMap[remap].(*EC2PricingData)
	if !ok {
		if !china {
			log.Default().Println("WARNING: Spot interrupt data has unknown OS", os, "for", instance.InstanceType)
		}
		return
	}

	osResult.PCTInterrupt = rValue
	osResult.PCTSavingsOD = &s
	onDemand := osResult.OnDemand
	if onDemand == "" {
		onDemand = "0"
	}
	estSpot := 0.01 * float64(100-s) * awsutils.Floaty(onDemand)
	if osResult.SpotAvg == 0 {
		osResult.SpotAvg = Price(estSpot)
	}
}

type spotAdvisorData struct {
	S int `json:"s"`
	R int `json:"r"`
}

type spotDataPartial struct {
	SpotAdvisor map[string]map[string]map[string]spotAdvisorData `json:"spot_advisor"`
}

func addSpotInterruptInfo(instances map[string]*EC2Instance, spotDataPartialGetter func() *spotDataPartial, china bool) {
	log.Default().Println("Adding spot interrupt info to EC2")

	spotData := spotDataPartialGetter()
	for region, operatingSystems := range spotData.SpotAdvisor {
		for os, spotAdvisorData := range operatingSystems {
			for instanceType, data := range spotAdvisorData {
				instance, ok := instances[instanceType]
				if !ok {
					if !china {
						log.Default().Println("WARNING: Spot interrupt data has unknown instance type", instanceType)
					}
					continue
				}

				processSpotInterruptData(region, os, instance, data.S, data.R, china)
			}
		}
	}
}

func int32Ptr(i int32) *int32 {
	return &i
}

func addSpotPricing(instances map[string]*EC2Instance, regions map[string]string) {
	log.Default().Println("Adding spot pricing to EC2")

	var success uintptr
	var regionFg utils.FunctionGroup
	instancesMu := sync.Mutex{}
	for region := range regions {
		regionFg.Add(func() {
			// Create a new configuration
			awsConfig, err := config.LoadDefaultConfig(context.Background())
			if err != nil {
				log.Fatal(err)
			}
			awsConfig.Region = region
			ec2Client := ec2.NewFromConfig(awsConfig)

			// Setup the iterator
			instanceTypes := make([]types.InstanceType, 0, len(instances))
			for instanceType := range instances {
				instanceTypes = append(instanceTypes, types.InstanceType(instanceType))
			}
			now := time.Now()
			paginator := ec2.NewDescribeSpotPriceHistoryPaginator(ec2Client, &ec2.DescribeSpotPriceHistoryInput{
				InstanceTypes: instanceTypes,
				StartTime:     &now,
				MaxResults:    int32Ptr(100),
			})

			// Process the spot price history
			firstPage := true
			for paginator.HasMorePages() {
				output, err := paginator.NextPage(context.TODO())
				if err != nil {
					if firstPage {
						// NEVER allow a ratelimit error.
						if strings.Contains(err.Error(), "RateLimitExceeded") {
							log.Fatal("EC2 region has a rate limit error", region)
						}

						// Use us-east-1 as the canary to make sure this works
						// Otherwise, this is probably fine
						if region == "us-east-1" {
							log.Fatal("failed to get spot pricing for us-east-1 ", err)
						}
						break
					} else {
						log.Fatal(err)
					}
				}
				firstPage = false
				atomic.AddUintptr(&success, 1)

				for _, price := range output.SpotPriceHistory {
					// Get the instance and platform this is relating to
					instancesMu.Lock()
					instance := instances[string(price.InstanceType)]
					if instance == nil {
						log.Fatalln("EC2 Spot pricing data has unknown instance type", price.InstanceType)
					}
					platform := awsutils.TranslatePlatformName(
						string(price.ProductDescription),
						"NA",
					)
					az := *price.AvailabilityZone
					region := az[:len(az)-1]

					// Get the platform pricing data
					pricingData := instance.Pricing[region]
					created := false
					if pricingData == nil {
						created = true
						pricingData = make(map[OS]any)
						instance.Pricing[region] = pricingData
					}
					instancesMu.Unlock()
					osMap, _ := pricingData[platform].(*EC2PricingData)
					if osMap == nil {
						created = true
						osMap = &EC2PricingData{}
					}

					if created {
						// Newly created pricing data - add ourself as the only item
						spotPrice := Price(awsutils.Floaty(*price.SpotPrice))
						osMap.spot = []Price{spotPrice}
						osMap.SpotMin = &spotPrice
						osMap.SpotMax = &spotPrice
					} else {
						// Append and sort everything
						if osMap.spot == nil {
							osMap.spot = make([]Price, 0)
						}
						osMap.spot = append(osMap.spot, Price(awsutils.Floaty(*price.SpotPrice)))
						slices.Sort(osMap.spot)
						osMap.SpotMin = &osMap.spot[0]
						osMap.SpotMax = &osMap.spot[len(osMap.spot)-1]
					}
					var avg Price = 0.0
					for _, spot := range osMap.spot {
						avg += spot
					}
					avg /= Price(len(osMap.spot))
					osMap.SpotAvg = Price(avg)
				}
			}
		})
	}
	regionFg.Run()

	if success == 0 {
		log.Fatalln("EC2 Spot pricing data failed to get any data")
	}
}
