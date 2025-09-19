package aws

import (
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

var RDS_FAMILY_NAMES = map[string]string{
	"t2":  "T2 General Purpose",
	"r3":  "R3 Memory Optimized",
	"r4":  "R4 Memory Optimized",
	"c3":  "C3 High-CPU",
	"c4":  "C4 High-CPU",
	"m3":  "M3 General Purpose",
	"i3":  "I3 High I/O",
	"cg1": "Cluster GPU",
	"cc2": "Cluster Compute",
	"cr1": "High Memory Cluster",
	"hs1": "High Storage",
	"c1":  "C1 High-CPU",
	"hi1": "HI1. High I/O",
	"m2":  "M2 High Memory",
	"m1":  "M1 General Purpose",
	"m4":  "M4 General Purpose",
}

var IGNORE_RDS_ATTRIBUTES = map[string]bool{
	"databaseEdition":  true,
	"databaseEngine":   true,
	"database_engine":  true,
	"deploymentOption": true,
	"engineCode":       true,
	"licenseModel":     true,
	"location":         true,
	"locationType":     true,
	"operation":        true,
	"region":           true,
	"usagetype":        true,
}

func enrichRdsInstance(
	instance map[string]any,
	attributes map[string]string,
	ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo],
) {
	// Clean up the memory attribute
	if attributes["memory"] != "" {
		attributes["memory"] = strings.Split(attributes["memory"], " ")[0]
	}

	// Copy them into the instance
	for k, v := range attributes {
		if _, ok := IGNORE_RDS_ATTRIBUTES[k]; !ok && v != "NA" {
			instance[k] = v
		}
	}

	// Add the pretty name
	instanceTypeWithoutDb := strings.TrimPrefix(instance["instance_type"].(string), "db.")
	if _, ok := instance["pretty_name"]; !ok {
		instance["pretty_name"] = awsutils.AddPrettyName(instanceTypeWithoutDb, RDS_FAMILY_NAMES)
	}

	// Check if we can supplement this instance with storage info
	apiData, ok := ec2ApiResponses.Get(instanceTypeWithoutDb)
	if ok {
		// Set the storage details
		if apiData.EbsInfo != nil {
			if apiData.EbsInfo.EbsOptimizedInfo != nil {
				ebsOptimizedInfo := apiData.EbsInfo.EbsOptimizedInfo
				instance["ebs_optimized"] = true
				instance["ebs_baseline_throughput"] = *ebsOptimizedInfo.BaselineThroughputInMBps
				instance["ebs_baseline_iops"] = int(*ebsOptimizedInfo.BaselineIops)
				instance["ebs_baseline_bandwidth"] = int(*ebsOptimizedInfo.BaselineBandwidthInMbps)
				instance["ebs_throughput"] = *ebsOptimizedInfo.MaximumThroughputInMBps
				instance["ebs_iops"] = int(*ebsOptimizedInfo.MaximumIops)
				instance["ebs_max_bandwidth"] = int(*ebsOptimizedInfo.MaximumBandwidthInMbps)
			}
		}
	}
}

var BAD_DESCRIPTION_CHUNKS = []string{
	"transfer",
	"global",
	"storage",
	"iops",
	"requests",
	"multi-az",
}

type genericAwsPricingData struct {
	OnDemand float64            `json:"ondemand"`
	Reserved map[string]float64 `json:"reserved"`
}

func processRdsOnDemandDimension(
	attributes map[string]string,
	priceDimension awsutils.RegionPriceDimension,
	getPricingdata func(platform string) *genericAwsPricingData,
	currency string,
) {
	descLower := strings.ToLower(priceDimension.Description)
	for _, chunk := range BAD_DESCRIPTION_CHUNKS {
		if strings.Contains(descLower, chunk) {
			// Skip these for now
			return
		}
	}

	usd := priceDimension.PricePerUnit[currency]
	if usd == "" {
		return
	}
	usdF := awsutils.Floaty(usd)
	if usdF == 0 {
		return
	}

	engineCode := attributes["engineCode"]
	if attributes["storage"] == "Aurora IO Optimization Mode" {
		engineCode = "211"
	}
	pricingData := getPricingdata(engineCode)
	pricingData.OnDemand = usdF

	pricingData = getPricingdata(attributes["databaseEngine"])
	if usdF > pricingData.OnDemand {
		pricingData.OnDemand = usdF
	}
}

func translateGenericAwsReservedTermAttributes(termAttributes map[string]string) string {
	leaseContractLength := termAttributes["LeaseContractLength"]
	purchaseOption := termAttributes["PurchaseOption"]

	lease := awsutils.LEASES[leaseContractLength]
	option := awsutils.PURCHASE_OPTIONS[purchaseOption]

	if lease == "" || option == "" {
		log.Fatalln("RDS or ElastiCache Reserved pricing data makes unknown term code", termAttributes)
	}

	return lease + "Standard." + option
}

func processRDSAndElastiCacheReservedOffer(
	data []*genericAwsPricingData,
	termCode string,
	offer awsutils.RegionTerm,
	currency string,
) {
	for _, data := range data {
		for _, offer := range offer.PriceDimensions {
			usd := offer.PricePerUnit[currency]
			if usd != "" && usd != "0" {
				f := awsutils.Floaty(usd)
				switch termCode {
				case "yrTerm1Standard.partialUpfront", "yrTerm1Standard.allUpfront":
					f = f / 365 / 24
				case "yrTerm3Standard.partialUpfront", "yrTerm3Standard.allUpfront":
					f = f / (365 * 3) / 24
				}
				if f != 0 && f > data.Reserved[termCode] {
					data.Reserved[termCode] = f
				}
			} else {
				log.Fatalln("RDS or ElastiCache Reserved pricing data has no price", offer)
			}
		}
	}
}

func processRdsReservedOffer(
	attributes map[string]string,
	offer awsutils.RegionTerm,
	getPricingData func(platform string) *genericAwsPricingData,
	currency string,
) {
	if attributes["deploymentOption"] != "Single-AZ" {
		return
	}

	data := []*genericAwsPricingData{
		getPricingData(attributes["databaseEngine"]),
		getPricingData(attributes["engineCode"]),
	}

	termCode := translateGenericAwsReservedTermAttributes(offer.TermAttributes)
	processRDSAndElastiCacheReservedOffer(data, termCode, offer, currency)
}

type genericAwsSkuData struct {
	instance   map[string]any
	attributes map[string]string
}

var RDS_DUPLICATED_KEYS = map[string]string{
	"instanceType":        "instance_type",
	"network_performance": "networkPerformance",
	"family":              "instanceFamily",
	"arch":                "processorArchitecture",
}

func getgenericAwsPricingData(instance map[string]any, regionName, platform string) *genericAwsPricingData {
	regionMap := instance["pricing"].(map[string]map[string]any)[regionName]
	if regionMap == nil {
		regionMap = make(map[string]any)
		instance["pricing"].(map[string]map[string]any)[regionName] = regionMap
	}
	osMap := regionMap[platform]
	if osMap == nil {
		osMap = &genericAwsPricingData{
			Reserved: make(map[string]float64),
		}
		regionMap[platform] = osMap
	}
	return osMap.(*genericAwsPricingData)
}

func processRDSData(inData chan *awsutils.RawRegion, ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo], china bool) {
	// Defines the currency
	currency := "USD"
	if china {
		currency = "CNY"
	}

	// Data that is used throughout the process
	instancesHashmap := make(map[string]map[string]any)
	sku2SkuData := make(map[string]genericAwsSkuData)

	// The descriptions found for each region
	regionDescriptions := make(map[string]string)

	for rawRegion := range inData {
		// Close the channel when we're done
		if rawRegion == nil {
			close(inData)
			break
		}

		// Process the products in the region
		regionDescription := ""
		for _, product := range rawRegion.RegionData.Products {
			if product.ProductFamily != "Database Instance" {
				continue
			}

			instanceType := product.Attributes["instanceType"]
			if instanceType == "" {
				continue
			}

			location := product.Attributes["location"]
			if location != "" {
				if regionDescription != "" && regionDescription != location {
					log.Fatalln("RDS Region description mismatch", regionDescription, location, "for", instanceType)
				}
				regionDescription = location
			}

			if product.Attributes["deploymentOption"] != "Single-AZ" {
				continue
			}

			instance, ok := instancesHashmap[instanceType]
			if !ok {
				instance = map[string]any{
					"instance_type":           instanceType,
					"pricing":                 make(map[string]map[string]any),
					"ebs_baseline_throughput": 0.0,
					"ebs_baseline_iops":       0,
					"ebs_baseline_bandwidth":  0,
					"ebs_throughput":          0.0,
					"ebs_iops":                0,
					"ebs_max_bandwidth":       0,
					"ebs_optimized":           false,
				}
				instancesHashmap[instanceType] = instance
			}

			sku2SkuData[product.SKU] = genericAwsSkuData{
				instance:   instance,
				attributes: product.Attributes,
			}
			enrichRdsInstance(instance, product.Attributes, ec2ApiResponses)
		}

		// Process the on demand pricing
		for _, offerMapping := range rawRegion.RegionData.Terms.OnDemand {
			for _, offer := range offerMapping {
				// Get the instance in question
				skuData, ok := sku2SkuData[offer.SKU]
				if !ok {
					continue
				}
				instance := skuData.instance
				attributes := skuData.attributes

				// Get the price dimension
				if len(offer.PriceDimensions) != 1 {
					log.Fatalln("RDS Pricing data has more than one price dimension for on demand", offer.SKU, instance["instance_type"])
				}
				var priceDimension awsutils.RegionPriceDimension
				for _, priceDimension = range offer.PriceDimensions {
					// Intentionally empty - this just gets the first one
				}

				// Handle getting the on demand pricing
				getPricingdataScoped := func(platform string) *genericAwsPricingData {
					return getgenericAwsPricingData(instance, rawRegion.RegionName, platform)
				}
				processRdsOnDemandDimension(attributes, priceDimension, getPricingdataScoped, currency)
			}
		}

		// Process the reserved pricing
		for _, offerMapping := range rawRegion.RegionData.Terms.Reserved {
			for _, offer := range offerMapping {
				// Get the instance in question
				skuData, ok := sku2SkuData[offer.SKU]
				if !ok {
					continue
				}
				instance := skuData.instance
				attributes := skuData.attributes

				// Process the reserved pricing
				getPricingdataScoped := func(platform string) *genericAwsPricingData {
					return getgenericAwsPricingData(instance, rawRegion.RegionName, platform)
				}
				processRdsReservedOffer(attributes, offer, getPricingdataScoped, currency)
			}
		}

		// Set the region description
		if regionDescription == "" {
			log.Fatalln("RDS Region description missing for", rawRegion.RegionName)
		} else {
			regionDescriptions[rawRegion.RegionName] = regionDescription
		}
	}

	// Clean up empty regions and set the regions map for non-empty regions
	for _, instance := range instancesHashmap {
		instance["regions"] = cleanEmptyRegions(instance["pricing"].(map[string]map[string]any), regionDescriptions)
	}

	// Save the data
	instancesSorted := make([]map[string]any, 0, len(instancesHashmap))
	for _, instance := range instancesHashmap {
		for k, v := range RDS_DUPLICATED_KEYS {
			instance[k] = instance[v]
		}
		instancesSorted = append(instancesSorted, instance)
	}
	sort.Slice(instancesSorted, func(i, j int) bool {
		return instancesSorted[i]["instance_type"].(string) < instancesSorted[j]["instance_type"].(string)
	})
	fp := "www/rds/instances.json"
	if china {
		fp = "www/rds/instances-cn.json"
	}
	utils.SaveInstances(instancesSorted, fp)
}
