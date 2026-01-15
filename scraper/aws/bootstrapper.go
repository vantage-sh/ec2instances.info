package aws

import (
	"context"
	"log"
	"runtime"
	"scraper/aws/awsutils"
	ec2Internal "scraper/aws/ec2"
	"scraper/utils"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

const (
	AWS_NON_CHINA_ROOT_URL = "https://pricing.us-east-1.amazonaws.com"
	AWS_CHINA_ROOT_URL     = "https://pricing.cn-north-1.amazonaws.com.cn"
)

// Loads an AWS "URL". These are generally actually paths.
func loadAwsUrlJson(baseUrl string, awsUrl string, val any) error {
	if strings.HasPrefix(awsUrl, "/") {
		awsUrl = baseUrl + awsUrl
	}
	return utils.LoadJson(awsUrl, val)
}

type AwsRootIndexResponse struct {
	Offers map[string]struct {
		CurrentSavingsPlanIndexUrl string `json:"currentSavingsPlanIndexUrl"`
		CurrentRegionIndexUrl      string `json:"currentRegionIndexUrl"`
	} `json:"offers"`
}

type AwsRegionIndexResponse struct {
	Regions map[string]struct {
		CurrentVersionUrl string `json:"currentVersionUrl"`
	} `json:"regions"`
}

type service struct {
	serviceName  string
	globalInData chan awsutils.RawRegion
	chinaInData  chan awsutils.RawRegion
}

type flatData struct {
	regionName        string
	currentVersionUrl string
}

func loadAllRegionsForServices(services []service, globalRootIndex, chinaRootIndex AwsRootIndexResponse) {
	// Global
	chinaToUrlToSavingsPlan := make(map[bool]map[string]func() map[string]map[string]map[string]float64)
	for _, service := range services {
		region, ok := globalRootIndex.Offers[service.serviceName]
		if !ok {
			log.Fatalf("Service %s not found in global root index", service.serviceName)
		}

		handler := func() map[string]map[string]map[string]float64 {
			return nil
		}
		urls, ok := chinaToUrlToSavingsPlan[false]
		if !ok {
			urls = make(map[string]func() map[string]map[string]map[string]float64)
			chinaToUrlToSavingsPlan[false] = urls
		}
		url := region.CurrentSavingsPlanIndexUrl
		if h, ok := urls[url]; ok {
			handler = h
		} else if url != "" {
			handler = awsutils.GetSavingsPlans(AWS_NON_CHINA_ROOT_URL, url, false)
			urls[url] = handler
		}

		go func() {
			var regionIndex AwsRegionIndexResponse
			if err := loadAwsUrlJson(AWS_NON_CHINA_ROOT_URL, region.CurrentRegionIndexUrl, &regionIndex); err != nil {
				log.Fatal(err)
			}

			dataFlattened := make([]flatData, 0, len(regionIndex.Regions))
			for regionName, regionMeta := range regionIndex.Regions {
				if regionName == "cn-north-1-pkx-1" {
					// Absolutely zero clue why this is being exposed by non-China, but
					// it breaks things later on. Continue past it.
					continue
				}
				dataFlattened = append(dataFlattened, flatData{
					regionName:        regionName,
					currentVersionUrl: regionMeta.CurrentVersionUrl,
				})
			}
			chunks := utils.Chunk(dataFlattened, 5)

			for _, chunk := range chunks {
				fg := utils.FunctionGroup{}
				for _, r := range chunk {
					fg.Add(func() {
						var j awsutils.RegionData
						if err := loadAwsUrlJson(AWS_NON_CHINA_ROOT_URL, r.currentVersionUrl, &j); err != nil {
							log.Fatal(err)
						}
						service.globalInData <- awsutils.RawRegion{
							RegionName: r.regionName,
							RegionData: j,
						}
					})
				}
				fg.Run()
				runtime.GC()
			}
			service.globalInData <- awsutils.RawRegion{
				SavingsPlanData: handler,
			}
		}()
	}

	// AWS China
	for _, service := range services {
		region, ok := chinaRootIndex.Offers[service.serviceName]
		if !ok {
			log.Fatalf("Service %s not found in china root index", service.serviceName)
		}

		handler := func() map[string]map[string]map[string]float64 {
			return nil
		}
		urls, ok := chinaToUrlToSavingsPlan[true]
		if !ok {
			urls = make(map[string]func() map[string]map[string]map[string]float64)
			chinaToUrlToSavingsPlan[true] = urls
		}
		url := region.CurrentSavingsPlanIndexUrl
		if h, ok := urls[url]; ok {
			handler = h
		} else if url != "" {
			handler = awsutils.GetSavingsPlans(AWS_CHINA_ROOT_URL, url, true)
			urls[url] = handler
		}

		go func() {
			var regionIndex AwsRegionIndexResponse
			if err := loadAwsUrlJson(AWS_CHINA_ROOT_URL, region.CurrentRegionIndexUrl, &regionIndex); err != nil {
				log.Fatal(err)
			}

			dataFlattened := make([]flatData, 0, len(regionIndex.Regions))
			for regionName, regionMeta := range regionIndex.Regions {
				if regionName == "aws-cn-other" {
					// Weird thing AWS sends in China
					continue
				}
				dataFlattened = append(dataFlattened, flatData{
					regionName:        regionName,
					currentVersionUrl: regionMeta.CurrentVersionUrl,
				})
			}
			chunks := utils.Chunk(dataFlattened, 5)

			for _, chunk := range chunks {
				fg := utils.FunctionGroup{}
				for _, r := range chunk {
					fg.Add(func() {
						var j awsutils.RegionData
						if err := loadAwsUrlJson(AWS_CHINA_ROOT_URL, r.currentVersionUrl, &j); err != nil {
							log.Fatal(err)
						}
						service.chinaInData <- awsutils.RawRegion{
							RegionName: r.regionName,
							RegionData: j,
						}
					})
				}
				fg.Run()
				runtime.GC()
			}
			service.chinaInData <- awsutils.RawRegion{
				SavingsPlanData: handler,
			}
		}()
	}
}

func int32Ptr(i int32) *int32 {
	return &i
}

var REGIONS_ITERATOR = []string{
	"us-east-1",
	"us-east-2",
	"us-west-1",
	"us-west-2",
	"eu-west-1",
	"eu-west-2",
	"eu-central-1",
}

func crossRegionDescribeInstanceTypesIterator(pushChunk func(map[string]*types.InstanceTypeInfo)) {
	set := map[string]struct{}{}
	setMu := sync.Mutex{}

	fg := utils.FunctionGroup{}
	for _, region := range REGIONS_ITERATOR {
		fg.Add(func() {
			// Create a new configuration
			awsConfig, err := config.LoadDefaultConfig(context.Background())
			if err != nil {
				log.Fatal(err)
			}
			awsConfig.Region = region
			ec2Client := ec2.NewFromConfig(awsConfig)

			// Setup the iterator
			paginator := ec2.NewDescribeInstanceTypesPaginator(ec2Client, &ec2.DescribeInstanceTypesInput{
				MaxResults: int32Ptr(100),
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
							log.Fatal("failed to get instance types for us-east-1 ", err)
						}
						break
					} else {
						log.Fatal(err)
					}
				}
				firstPage = false

				// Get all the instance types
				instanceTypesRemapped := make(map[string]*types.InstanceTypeInfo)
				setMu.Lock()
				new_ := 0
				for i := range output.InstanceTypes {
					// Make sure the instance type is new
					iType := string(output.InstanceTypes[i].InstanceType)
					if _, ok := set[iType]; ok {
						continue
					}
					set[iType] = struct{}{}
					new_++

					// Add the instance type to the map
					instanceTypesRemapped[iType] = &output.InstanceTypes[i]
				}
				setMu.Unlock()
				if new_ > 0 {
					pushChunk(instanceTypesRemapped)
					log.Default().Println("Processed", new_, "unique instance type description responses for", region)
				}
				runtime.GC()
			}
		})
	}
	fg.Run()
}

// DoAwsScraping is the main function that scrapes the AWS pricing data and saves it to a file.
func DoAwsScraping() {
	// Load the root indexes
	rootIndexChannel := make(chan AwsRootIndexResponse)
	go func() {
		var rootIndex AwsRootIndexResponse
		if err := loadAwsUrlJson(AWS_NON_CHINA_ROOT_URL, "/offers/v1.0/aws/index.json", &rootIndex); err != nil {
			log.Fatal(err)
		}
		rootIndexChannel <- rootIndex
	}()
	chinaIndexChannel := make(chan AwsRootIndexResponse)
	go func() {
		var chinaIndex AwsRootIndexResponse
		if err := loadAwsUrlJson(AWS_CHINA_ROOT_URL, "/offers/v1.0/cn/index.json", &chinaIndex); err != nil {
			log.Fatal(err)
		}
		chinaIndexChannel <- chinaIndex
	}()

	var fg utils.FunctionGroup

	// Get the EC2 API responses here because both EC2 and RDS use the data
	ec2ApiResponses := utils.NewSlowBuildingMap(crossRegionDescribeInstanceTypesIterator)

	// Start the EC2 data processing threads (this is outside of this function because its complex)
	ec2GlobalChannel, ec2ChinaChannel := ec2Internal.Setup(&fg, ec2ApiResponses)

	// Defines the channel for the RDS data
	rdsGlobalChannel := make(chan awsutils.RawRegion)
	rdsChinaChannel := make(chan awsutils.RawRegion)
	fg.Add(func() {
		processRDSData(rdsChinaChannel, ec2ApiResponses, true)
	})
	fg.Add(func() {
		processRDSData(rdsGlobalChannel, ec2ApiResponses, false)
	})

	// Get the ElastiCache cache parameters in the background
	cacheParamsGetter := utils.BlockUntilDone(getElastiCacheCacheParameters)

	// Defines the channel for the ElastiCache data
	elastiCacheGlobalChannel := make(chan awsutils.RawRegion)
	elastiCacheChinaChannel := make(chan awsutils.RawRegion)
	fg.Add(func() {
		processElastiCacheData(elastiCacheChinaChannel, true, cacheParamsGetter)
	})
	fg.Add(func() {
		processElastiCacheData(elastiCacheGlobalChannel, false, cacheParamsGetter)
	})

	// Get the Redshift node parameters in the background
	redshiftNodeParametersGetter := utils.BlockUntilDone(getRedshiftNodeParameters)

	// Defines the channel for the Redshift data
	redshiftGlobalChannel := make(chan awsutils.RawRegion)
	redshiftChinaChannel := make(chan awsutils.RawRegion)
	fg.Add(func() {
		processRedshiftData(redshiftChinaChannel, true, redshiftNodeParametersGetter)
	})
	fg.Add(func() {
		processRedshiftData(redshiftGlobalChannel, false, redshiftNodeParametersGetter)
	})

	// Get the OpenSearch volume quotas in the background
	volumeQuotasGetter := utils.BlockUntilDone(getOpenSearchVolumeQuotas)

	// Defines the channel for the OpenSearch data
	openSearchGlobalChannel := make(chan awsutils.RawRegion)
	openSearchChinaChannel := make(chan awsutils.RawRegion)
	fg.Add(func() {
		processOpenSearchData(openSearchChinaChannel, true, volumeQuotasGetter)
	})
	fg.Add(func() {
		processOpenSearchData(openSearchGlobalChannel, false, volumeQuotasGetter)
	})

	// Load all the regions for the things we care about
	loadAllRegionsForServices([]service{
		{
			serviceName:  "AmazonEC2",
			globalInData: ec2GlobalChannel,
			chinaInData:  ec2ChinaChannel,
		},
		{
			serviceName:  "AmazonRDS",
			globalInData: rdsGlobalChannel,
			chinaInData:  rdsChinaChannel,
		},
		{
			serviceName:  "AmazonElastiCache",
			globalInData: elastiCacheGlobalChannel,
			chinaInData:  elastiCacheChinaChannel,
		},
		{
			serviceName:  "AmazonRedshift",
			globalInData: redshiftGlobalChannel,
			chinaInData:  redshiftChinaChannel,
		},
		{
			serviceName:  "AmazonES",
			globalInData: openSearchGlobalChannel,
			chinaInData:  openSearchChinaChannel,
		},
	}, <-rootIndexChannel, <-chinaIndexChannel)

	// Wait for all the data to be processed
	fg.Run()
}
