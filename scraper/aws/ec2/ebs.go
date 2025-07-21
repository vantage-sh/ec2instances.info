package ec2

import (
	"log"
	"scraper/aws/awsutils"
	"strconv"
)

type EBSConfig struct {
	Regions []EBSRegion `json:"regions"`
}

type EBSValueColumn struct {
	Prices map[string]string `json:"prices"`
}

type EBSStorageSize struct {
	Size         string           `json:"size"`
	ValueColumns []EBSValueColumn `json:"valueColumns"`
}

type EBSInstanceType struct {
	Sizes []EBSStorageSize `json:"sizes"`
}

type EBSRegion struct {
	Region        string            `json:"region"`
	InstanceTypes []EBSInstanceType `json:"instanceTypes"`
}

type EBSData struct {
	Config EBSConfig `json:"config"`
}

var EBS_REGION_MAP = map[string]string{
	"eu-ireland":   "eu-west-1",
	"eu-frankfurt": "eu-central-1",
	"apac-sin":     "ap-southeast-1",
	"apac-syd":     "ap-southeast-2",
	"apac-tokyo":   "ap-northeast-1",
}

func transformEbsRegionName(region string) string {
	if region, ok := EBS_REGION_MAP[region]; ok {
		return region
	}

	// Parse region name to extract base and number
	// Pattern: ^([^0-9]*)(-(\d))?$
	// This matches a region name that optionally ends with a dash and number
	for i := len(region) - 1; i >= 0; i-- {
		if region[i] == '-' {
			// Check if what follows is a number
			if i+1 < len(region) {
				numStr := region[i+1:]
				if _, err := strconv.Atoi(numStr); err == nil {
					// Valid format: base-number
					return region
				}
			}
			// Invalid format, treat as base-1
			return region + "-1"
		}
		if region[i] >= '0' && region[i] <= '9' {
			continue
		}
		// Found non-digit character, everything before this is the base
		// If no dash found, append -1
		return region + "-1"
	}

	log.Fatalln("Can't parse region", region)
	return ""
}

func addEBSPricing(instances map[string]*EC2Instance, currency string) {
	log.Default().Println("Adding EBS pricing to EC2")

	var ebsData EBSData
	err := awsutils.FetchDataFromAWSWebsite(
		"https://a0.awsstatic.com/pricing/1/ec2/pricing-ebs-optimized-instances.min.js",
		&ebsData,
	)
	if err != nil {
		log.Fatalln("Failed to fetch EBS pricing data", err)
	}

	for _, regionSpec := range ebsData.Config.Regions {
		region := transformEbsRegionName(regionSpec.Region)
		for _, instanceTypeSpec := range regionSpec.InstanceTypes {
			for _, sizeSpec := range instanceTypeSpec.Sizes {
				instance := instances[sizeSpec.Size]
				if instance == nil {
					log.Fatalln("EBS pricing data has unknown instance type", sizeSpec.Size)
				}
				pricingData := instance.Pricing[region]
				if pricingData == nil {
					pricingData = make(map[OS]any)
				}
				for _, col := range sizeSpec.ValueColumns {
					price, ok := col.Prices[currency]
					if !ok {
						log.Fatalln("EBS pricing data has no price for", sizeSpec.Size, col.Prices)
					}
					priceFloat, err := strconv.ParseFloat(price, 64)
					if err != nil {
						log.Fatalln("EBS pricing data has invalid price for", sizeSpec.Size, col.Prices)
					}
					pricingData["ebs"] = formatPrice(priceFloat)
				}
			}
		}
	}
}
