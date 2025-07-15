package aws

import (
	"log"
	"scraper/utils"
	"strings"
)

const AWS_NON_CHINA_ROOT_URL = "https://pricing.us-east-1.amazonaws.com"

// Loads an AWS "URL". These are generally actually paths.
func loadAwsUrlJson(baseUrl string, awsUrl string, val any) error {
	if strings.HasPrefix(awsUrl, "/") {
		awsUrl = baseUrl + awsUrl
	}
	return utils.LoadJson(awsUrl, val)
}

type AwsRootIndexResponse struct {
	Offers map[string]struct {
		CurrentRegionIndexUrl string `json:"currentRegionIndexUrl"`
	} `json:"offers"`
}

type AwsRegionIndexResponse struct {
	Regions map[string]struct {
		CurrentVersionUrl string `json:"currentVersionUrl"`
	} `json:"regions"`
}

type RegionProduct struct {
	SKU           string            `json:"sku"`
	ProductFamily string            `json:"productFamily"`
	Attributes    map[string]string `json:"attributes"`
}

type RegionPriceDimension struct {
	RateCode     string            `json:"rateCode"`
	Description  string            `json:"description"`
	BeginRange   string            `json:"beginRange"`
	EndRange     string            `json:"endRange"`
	Unit         string            `json:"unit"`
	PricePerUnit map[string]string `json:"pricePerUnit"`
}

type RegionTerm struct {
	SKU             string                          `json:"sku"`
	PriceDimensions map[string]RegionPriceDimension `json:"priceDimensions"`
	TermAttributes  map[string]string               `json:"termAttributes"`
}

type RegionTerms struct {
	OnDemand map[string]map[string]RegionTerm `json:"OnDemand"`
	Reserved map[string]map[string]RegionTerm `json:"Reserved"`
}

type RegionData struct {
	Products map[string]RegionProduct `json:"products"`
	Terms    RegionTerms              `json:"terms"`
}

type rawRegion struct {
	regionName string
	regionData RegionData
}

type service struct {
	serviceName string
	inData      chan *rawRegion
}

func loadAllRegionsForServices(services []service, rootIndex AwsRootIndexResponse) {
	for _, service := range services {
		region, ok := rootIndex.Offers[service.serviceName]
		if !ok {
			log.Fatalf("Service %s not found in root index", service.serviceName)
		}

		go func() {
			var regionIndex AwsRegionIndexResponse
			if err := loadAwsUrlJson(AWS_NON_CHINA_ROOT_URL, region.CurrentRegionIndexUrl, &regionIndex); err != nil {
				log.Fatal(err)
			}

			for regionName, regionMeta := range regionIndex.Regions {
				var j RegionData
				if err := loadAwsUrlJson(AWS_NON_CHINA_ROOT_URL, regionMeta.CurrentVersionUrl, &j); err != nil {
					log.Fatal(err)
				}

				service.inData <- &rawRegion{
					regionName: regionName,
					regionData: j,
				}
			}
			service.inData <- nil
		}()
	}
}

// DoAwsScraping is the main function that scrapes the AWS pricing data and saves it to a file.
func DoAwsScraping() {
	// Load the root index
	var rootIndex AwsRootIndexResponse
	if err := loadAwsUrlJson(AWS_NON_CHINA_ROOT_URL, "/offers/v1.0/aws/index.json", &rootIndex); err != nil {
		log.Fatal(err)
	}

	var fg utils.FunctionGroup

	// Get the EC2 API responses here because both EC2 and RDS use the data
	ec2ApiResponses := makeEc2Iterator()

	// Defines the channel for the EC2 data
	ec2Channel := make(chan *rawRegion)
	fg.Add(func() {
		processEC2Data(ec2Channel, ec2ApiResponses)
	})

	// Defines the channel for the RDS data
	rdsChannel := make(chan *rawRegion)
	fg.Add(func() {
		processRDSData(rdsChannel, ec2ApiResponses)
	})

	// Defines the channel for the ElastiCache data
	elastiCacheChannel := make(chan *rawRegion)
	fg.Add(func() {
		processElastiCacheData(elastiCacheChannel)
	})

	// Defines the channel for the Redshift data
	redshiftChannel := make(chan *rawRegion)
	fg.Add(func() {
		processRedshiftData(redshiftChannel)
	})

	// Defines the channel for the OpenSearch data
	openSearchChannel := make(chan *rawRegion)
	fg.Add(func() {
		processOpenSearchData(openSearchChannel)
	})

	// Load all the regions for the things we care about
	loadAllRegionsForServices([]service{
		{
			serviceName: "AmazonEC2",
			inData:      ec2Channel,
		},
		{
			serviceName: "AmazonRDS",
			inData:      rdsChannel,
		},
		{
			serviceName: "AmazonElastiCache",
			inData:      elastiCacheChannel,
		},
		{
			serviceName: "AmazonRedshift",
			inData:      redshiftChannel,
		},
		{
			serviceName: "AmazonES",
			inData:      openSearchChannel,
		},
	}, rootIndex)

	// Wait for all the data to be processed
	fg.Run()
}
