package aws

import (
	"context"
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/elasticache"
)

var IGNORE_ELASTICACHE_ATTRIBUTES = map[string]bool{
	"location":     true,
	"locationType": true,
	"operation":    true,
	"region":       true,
	"usagetype":    true,
}

var ELASTICACHE_FAMILY_NAMES = map[string]string{
	"t4g":  "T4g General Purpose Graviton",
	"t3":   "T3 General Purpose",
	"t2":   "T2 General Purpose",
	"t1":   "T1 Previous generation: (not recommended)",
	"m6g":  "M6g General Purpose Graviton",
	"m5":   "M5 General Purpose",
	"m4":   "M4 General Purpose",
	"m3":   "M3 Previous generation: (not recommended)",
	"m2":   "M2 General Purpose",
	"m1":   "M1 Previous generation: (not recommended)",
	"r6gd": "R6gd Memory optimized (SSD storage)",
	"r6g":  "R6g Memory optimized",
	"r5":   "R5 Memory optimized",
	"r4":   "R4 Memory optimized",
	"r3":   "R3 Memory optimized (not recommended)",
	"c1":   "C1 Compute optimized (not recommended)",
}

var LOW_MAX_CLIENTS = map[string]bool{
	"cache.t2.micro":  true,
	"cache.t2.small":  true,
	"cache.t2.medium": true,
	"cache.t3.micro":  true,
	"cache.t4g.micro": true,
}

func enrichElastiCacheInstance(instance map[string]any, attributes map[string]string) {
	// Clean up the memory attribute
	if attributes["memory"] != "" {
		attributes["memory"] = strings.Split(attributes["memory"], " ")[0]
	}

	// Copy them into the instance
	for k, v := range attributes {
		if _, ok := IGNORE_ELASTICACHE_ATTRIBUTES[k]; !ok && v != "NA" {
			instance[k] = v
		}
	}
	if _, ok := attributes["networkPerformance"]; ok {
		instance["network_performance"] = attributes["networkPerformance"]
	} else {
		instance["network_performance"] = nil
	}
	if f, ok := attributes["instanceFamily"]; ok {
		instance["family"] = f
	}

	// Add the pretty name
	if _, ok := instance["pretty_name"]; !ok {
		instanceTypeWithoutCache := strings.TrimPrefix(instance["instance_type"].(string), "cache.")
		instance["pretty_name"] = awsutils.AddPrettyName(instanceTypeWithoutCache, ELASTICACHE_FAMILY_NAMES)
	}

	// Add the max clients
	if _, ok := LOW_MAX_CLIENTS[instance["instance_type"].(string)]; ok {
		instance["max_clients"] = "20000"
	} else {
		instance["max_clients"] = "65000"
	}
}

func processElastiCacheOnDemandDimension(attributes map[string]string, priceDimension awsutils.RegionPriceDimension, getPricingData func(platform string) *genericAwsPricingData, currency string) {
	descLower := strings.ToLower(priceDimension.Description)
	for _, chunk := range BAD_DESCRIPTION_CHUNKS {
		if strings.Contains(descLower, chunk) {
			// Skip these for now
			return
		}
	}

	cacheEngine := attributes["cacheEngine"]
	usd := priceDimension.PricePerUnit[currency]
	if usd != "" {
		usdF := awsutils.Floaty(usd)
		pricingData := getPricingData(cacheEngine)
		pricingData.OnDemand = usdF
	}
}

func processElastiCacheReservedOffer(attributes map[string]string, offer awsutils.RegionTerm, getPricingData func(platform string) *genericAwsPricingData, currency string) {
	data := []*genericAwsPricingData{
		getPricingData(attributes["cacheEngine"]),
	}
	termCode := translateGenericAwsReservedTermAttributes(offer.TermAttributes)
	processRDSAndElastiCacheReservedOffer(data, termCode, offer, currency)
}

func getElastiCacheCacheParameters() map[string]map[string]string {
	instanceData := make(map[string]map[string]string)

	paramFams := []string{"memcached1.6", "redis6.x"}
	for _, paramFam := range paramFams {
		response, err := elasticacheClient.DescribeEngineDefaultParameters(context.TODO(), &elasticache.DescribeEngineDefaultParametersInput{
			CacheParameterGroupFamily: &paramFam,
		})
		if err != nil {
			log.Fatalln("Error getting ElastiCache cache parameters", err)
		}
		for _, family := range response.EngineDefaults.CacheNodeTypeSpecificParameters {
			paramName := *family.ParameterName
			paramsSets := family.CacheNodeTypeSpecificValues
			for _, param := range paramsSets {
				// Get the map
				itype := *param.CacheNodeType
				m, ok := instanceData[itype]
				if !ok {
					m = make(map[string]string)
					instanceData[itype] = m
				}

				// Add the parameter to the map
				osParam := paramFam + "-" + paramName
				m[osParam] = *param.Value
			}
		}
	}
	log.Println("ElastiCache cache parameters from AWS")

	return instanceData
}

func processElastiCacheData(
	inData chan awsutils.RawRegion,
	china bool,
	cacheParamsGetter func() map[string]map[string]string,
) {
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

	// Process each region as it comes in
	var savingsPlan func() map[string]map[string]map[string]float64
	for rawRegion := range inData {
		// Close the channel when we're done
		if rawRegion.SavingsPlanData != nil {
			savingsPlan = rawRegion.SavingsPlanData
			close(inData)
			break
		}

		// Process the products in the region
		regionDescription := ""
		for _, product := range rawRegion.RegionData.Products {
			if product.ProductFamily != "Cache Instance" {
				continue
			}

			location := product.Attributes["location"]
			if location != "" {
				if regionDescription != "" && regionDescription != location {
					log.Fatalln("ElastiCache Region description mismatch", regionDescription, location, "for", product.Attributes["instanceType"])
				}
				regionDescription = location
			}

			if strings.Contains(product.Attributes["locationType"], "US") {
				continue
			}

			instanceType := product.Attributes["instanceType"]
			if instanceType == "" {
				continue
			}

			instance, ok := instancesHashmap[instanceType]
			if !ok {
				instance = map[string]any{
					"instance_type": instanceType,
					"pricing":       make(map[string]map[string]any),
				}
				instancesHashmap[instanceType] = instance
			}
			sku2SkuData[product.SKU] = genericAwsSkuData{
				instance:   instance,
				attributes: product.Attributes,
			}
			enrichElastiCacheInstance(instance, product.Attributes)
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
					log.Fatalln("ElastiCache Pricing data has more than one price dimension for on demand", offer.SKU, instance["instance_type"])
				}
				var priceDimension awsutils.RegionPriceDimension
				for _, priceDimension = range offer.PriceDimensions {
					// Intentionally empty - this just gets the first one
				}

				// Handle getting the on demand pricing
				getPricingdataScoped := func(platform string) *genericAwsPricingData {
					return getgenericAwsPricingData(instance, rawRegion.RegionName, platform)
				}
				processElastiCacheOnDemandDimension(attributes, priceDimension, getPricingdataScoped, currency)
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
				processElastiCacheReservedOffer(attributes, offer, getPricingdataScoped, currency)
			}
		}

		// Set the region description
		if regionDescription == "" {
			log.Fatalln("ElastiCache Region description missing for", rawRegion.RegionName)
		} else {
			regionDescriptions[rawRegion.RegionName] = regionDescription
		}
	}

	// Add savings plans pricing
	for region, skuMap := range savingsPlan() {
		for sku, termMap := range skuMap {
			skuInfo, ok := sku2SkuData[sku]
			if !ok {
				continue
			}
			for term, price := range termMap {
				pricingData := getgenericAwsPricingData(skuInfo.instance, region, skuInfo.attributes["cacheEngine"])
				if pricingData.Reserved == nil {
					pricingData.Reserved = map[string]float64{}
				}
				pricingData.Reserved[term] = price
			}
		}
	}

	// Clean up empty regions and set the regions map for non-empty regions
	for _, instance := range instancesHashmap {
		instance["regions"] = cleanEmptyRegions(instance["pricing"].(map[string]map[string]any), regionDescriptions)
	}

	// Set the cache parameters
	for instanceType, cacheParameters := range cacheParamsGetter() {
		instance, ok := instancesHashmap[instanceType]
		if !ok {
			continue
		}
		for k, v := range cacheParameters {
			instance[k] = v
		}
	}

	// Save the data
	instancesSorted := make([]map[string]any, 0, len(instancesHashmap))
	for _, instance := range instancesHashmap {
		instancesSorted = append(instancesSorted, instance)
	}
	sort.Slice(instancesSorted, func(i, j int) bool {
		return instancesSorted[i]["instance_type"].(string) < instancesSorted[j]["instance_type"].(string)
	})
	fp := "www/cache/instances.json"
	if china {
		fp = "www/cache/instances-cn.json"
	}
	utils.SaveInstances(instancesSorted, fp)
}
