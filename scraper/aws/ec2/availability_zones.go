package ec2

import (
	"context"
	"log"
	"scraper/utils"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func addAvailabilityZoneInfo(instances map[string]*EC2Instance, regions map[string]string) {
	log.Default().Println("Adding availability zone info to EC2")

	var fg utils.FunctionGroup
	var instancesMutex sync.Mutex
	var success uintptr

	for region := range regions {
		fg.Add(func() {
			awsConfig, err := config.LoadDefaultConfig(context.TODO(),
				config.WithRetryMaxAttempts(10),
				config.WithRetryMode(aws.RetryModeAdaptive),
			)
			if err != nil {
				log.Fatal(err)
			}
			awsConfig.Region = region
			ec2Client := ec2.NewFromConfig(awsConfig)
			paginator := ec2.NewDescribeInstanceTypeOfferingsPaginator(ec2Client, &ec2.DescribeInstanceTypeOfferingsInput{
				LocationType: types.LocationTypeAvailabilityZoneId,
				MaxResults:   int32Ptr(100),
			})

			// For each region, we can make our own local map of instances to AZ's and then merge back
			// this means we have to lock the main thread less, as we are only blocking when merging this "local" map, and not on every lookup into instances map

			local := make(map[string][]string)
			firstPage := true
			for paginator.HasMorePages() {
				output, err := paginator.NextPage(context.Background())
				if err != nil {
					if firstPage {
						if strings.Contains(err.Error(), "RateLimitExceeded") {
							log.Fatal("EC2 region has a rate limit error", region)
						}
						if region == "us-east-1" {
							log.Fatal("failed to get availability zones for us-east-1 ", err)
						}
						break
					}
					log.Fatal(err)
				}
				firstPage = false
				atomic.AddUintptr(&success, 1)

				for _, offering := range output.InstanceTypeOfferings {
					instanceType := string(offering.InstanceType)
					location := aws.ToString(offering.Location)
					if location == "" {
						continue
					}

					local[instanceType] = append(
						local[instanceType],
						location,
					)
				}
			}

			if len(local) == 0 {
				return
			}

			instancesMutex.Lock()
			for instanceType, instanceAvailabilityZonesForRegion := range local {
				instance := instances[instanceType]
				if instance == nil {
					continue
				}
				if instance.AvailabilityZones == nil {
					instance.AvailabilityZones = make(map[string][]string)
				}
				instance.AvailabilityZones[region] = instanceAvailabilityZonesForRegion
			}
			instancesMutex.Unlock()
		})
	}
	fg.Run()

	if success == 0 {
		log.Fatalln("EC2 availability zone data failed to get any data")
	}
}
