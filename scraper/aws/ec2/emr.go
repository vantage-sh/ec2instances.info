package ec2

import (
	"log"
	"scraper/aws/awsutils"
	"strings"
)

type emrPrice struct {
	Price string `json:"price"`
}

type emrData struct {
	Regions map[string]map[string]emrPrice `json:"regions"`
}

func addEmrPricingCn(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	// TODO: Add China
}

const EMR_INSTANCE_TYPE_PREFIX = "Instance-instancetype-"

func addEmrPricingUs(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	log.Default().Println("Adding EMR pricing to EC2")

	var emrData emrData
	err := awsutils.FetchDataFromAWSWebsite(
		"https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/elasticmapreduce/USD/current/elasticmapreduce.json",
		&emrData,
	)
	if err != nil {
		log.Fatalln("Failed to fetch EMR pricing data", err)
	}

	for regionName, instanceTypes := range emrData.Regions {
		var regions []string
		if regionName == "AWS GovCloud (US)" {
			// Special case for GovCloud
			regions = []string{"us-gov-west-1", "us-gov-east-1"}
		} else {
			// Generally just one region
			region := regionsInverted[regionName]
			if region == "" {
				// This includes weird stuff sometimes. Probably fine.
				continue
			}
			regions = []string{region}
		}

		for priceId, price := range instanceTypes {
			if strings.HasPrefix(priceId, EMR_INSTANCE_TYPE_PREFIX) {
				instanceType := priceId[len(EMR_INSTANCE_TYPE_PREFIX):]
				instance := instances[instanceType]
				if instance == nil {
					log.Default().Println("WARNING: EMR pricing data has unknown instance type", instanceType)
					continue
				}
				for _, region := range regions {
					pricingData := instance.Pricing[region]
					if pricingData == nil {
						pricingData = make(map[OS]any)
						instance.Pricing[region] = pricingData
					}
					pricingData["emr"] = &EC2PricingData{
						EMR: price.Price,
					}
					instance.EMR = true
				}
			}
		}
	}
}
