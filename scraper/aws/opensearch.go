package aws

import (
	"errors"
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"sort"
	"strings"

	"github.com/anaskhan96/soup"
)

var OPENSEARCH_FAMILY_NAMES = map[string]string{
	"t2":   "T2 General Purpose",
	"t3":   "T3 General Purpose",
	"m3":   "M3 General Purpose",
	"m4":   "M4 General Purpose",
	"m5":   "M5 General Purpose",
	"m6g":  "M6G General Purpose",
	"c4":   "C4 Compute Optimized",
	"c5":   "C5 Compute Optimized",
	"c6g":  "C6G Compute Optimized",
	"r3":   "R3 Memory Optimized",
	"r4":   "R4 Memory Optimized",
	"r5":   "R5 Memory Optimized",
	"r6g":  "R6G Memory Optimized",
	"r6gd": "R6GD Memory Optimized (NVME SSD)",
	"i2":   "I2 Storage Optimized",
	"i3":   "I3 Storage Optimized",
}

var IGNORE_OPENSEARCH_ATTRIBUTES = map[string]bool{
	"location":     true,
	"locationType": true,
	"operation":    true,
	"region":       true,
	"usagetype":    true,
}

func enrichOpenSearchInstance(instance map[string]any, attributes map[string]string) {
	// Clean up the memory attribute
	if attributes["memoryGib"] != "" {
		attributes["memory"] = strings.Split(attributes["memoryGib"], " ")[0]
	}
	attributes["family"] = attributes["instanceFamily"]

	// Copy them into the instance
	for k, v := range attributes {
		if _, ok := IGNORE_OPENSEARCH_ATTRIBUTES[k]; !ok && v != "NA" {
			instance[k] = v
		}
	}

	// Add the pretty name
	if _, ok := instance["pretty_name"]; !ok {
		instanceType := instance["instance_type"].(string)
		instance["pretty_name"] = awsutils.AddPrettyName(instanceType, OPENSEARCH_FAMILY_NAMES)
	}
}

func searchForTableWithHeader(doc *soup.Root, header string) soup.Root {
	tableContainers := doc.FindAll("div", "class", "table-container")
	for _, tableContainer := range tableContainers {
		table := tableContainer.Find("table")
		if table.Error != nil {
			continue
		}
		thead := table.Find("thead")
		if thead.Error != nil {
			continue
		}
		ths := thead.FindAll("th")
		for _, th := range ths {
			if strings.TrimSpace(th.FullText()) == header {
				return table
			}
		}
	}
	return soup.Root{
		Error: errors.New("table not found"),
	}
}

const OPENSEARCH_VOLUME_QUOTAS_URL = "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html"

func getOpenSearchVolumeQuotas() map[string]map[string]string {
	extraMetadata := make(map[string]map[string]string)

	doc, err := utils.LoadHTML(OPENSEARCH_VOLUME_QUOTAS_URL)
	if err != nil {
		log.Fatalln("Failed to get OpenSearch volume quotas", err)
	}

	table := searchForTableWithHeader(doc, "Minimum EBS size")
	if table.Error != nil {
		log.Fatalln("Failed to get OpenSearch volume quotas", table.Error)
	}

	tbody := table.Find("tbody")
	if tbody.Error != nil {
		log.Fatalln("Failed to get OpenSearch volume quotas", tbody.Error)
	}

	trs := tbody.FindAll("tr")
	for _, tr := range trs {
		tds := tr.FindAll("td")
		if len(tds) < 4 {
			continue
		}
		instanceType := strings.TrimSpace(tds[0].FullText())
		minEbs := strings.TrimSpace(tds[1].FullText())
		maxEbsGp2 := strings.TrimSpace(tds[2].FullText())
		maxEbsGp3 := strings.TrimSpace(tds[3].FullText())

		if instanceType == "" {
			continue
		}

		extraMetadata[instanceType] = map[string]string{
			"min_ebs":     minEbs,
			"max_ebs_gp2": maxEbsGp2,
			"max_ebs_gp3": maxEbsGp3,
		}
	}

	table = searchForTableWithHeader(doc, "Maximum size of HTTP request payloads")
	if table.Error != nil {
		log.Fatalln("Failed to get OpenSearch volume quotas", table.Error)
	}
	tbody = table.Find("tbody")
	if tbody.Error != nil {
		log.Fatalln("Failed to get OpenSearch volume quotas", tbody.Error)
	}
	trs = tbody.FindAll("tr")
	for _, tr := range trs {
		tds := tr.FindAll("td")
		if len(tds) < 2 {
			continue
		}

		instanceType := strings.TrimSpace(tds[0].FullText())
		maxHttpPayload := strings.TrimSpace(tds[1].FullText())

		if instanceType == "" {
			continue
		}

		extra, ok := extraMetadata[instanceType]
		if !ok {
			extra = map[string]string{}
		}
		extra["max_http_payload"] = maxHttpPayload
		extraMetadata[instanceType] = extra
	}

	table = searchForTableWithHeader(doc, "Maximum storage")
	if table.Error != nil {
		log.Fatalln("Failed to get OpenSearch volume quotas", table.Error)
	}
	tbody = table.Find("tbody")
	if tbody.Error != nil {
		log.Fatalln("Failed to get OpenSearch volume quotas", tbody.Error)
	}
	trs = tbody.FindAll("tr")
	for _, tr := range trs {
		tds := tr.FindAll("td")
		if len(tds) < 2 {
			continue
		}
		instanceType := strings.TrimSpace(tds[0].FullText())
		maxStorage := strings.TrimSpace(tds[1].FullText())

		if instanceType == "" {
			continue
		}

		extra, ok := extraMetadata[instanceType]
		if !ok {
			extra = map[string]string{}
		}
		extra["max_storage"] = maxStorage
		extraMetadata[instanceType] = extra
	}

	return extraMetadata
}

func processOpenSearchData(
	inData chan awsutils.RawRegion,
	china bool,
	volumeQuotasGetter func() map[string]map[string]string,
) {
	// Defines the currency
	currency := "USD"
	if china {
		currency = "CNY"
	}

	// Data that is used throughout the process
	instancesHashmap := make(map[string]map[string]any)
	sku2Instance := make(map[string]map[string]any)

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
			if product.ProductFamily != "Amazon OpenSearch Service Instance" ||
				product.Attributes["operation"] == "DirectQueryAmazonS3GDCOCU" {
				continue
			}

			location := product.Attributes["location"]
			if location != "" {
				if regionDescription != "" && regionDescription != location {
					log.Fatalln("OpenSearch Region description mismatch", regionDescription, location, "for", product.Attributes["instanceType"])
				}
				regionDescription = location
			}

			instanceType := product.Attributes["instanceType"]
			if instanceType == "" {
				continue
			}

			instance, ok := instancesHashmap[instanceType]
			if !ok {
				instance = map[string]any{
					"instance_type": product.Attributes["instanceType"],
					"pricing":       make(map[string]*genericAwsPricingData),
				}
				instancesHashmap[instanceType] = instance
			}
			sku2Instance[product.SKU] = instance
			enrichOpenSearchInstance(instance, product.Attributes)
		}

		// Process the on demand pricing
		for _, offerMapping := range rawRegion.RegionData.Terms.OnDemand {
			for _, offer := range offerMapping {
				// Get the instance in question
				instance, ok := sku2Instance[offer.SKU]
				if !ok {
					continue
				}

				// Get the price dimension
				if len(offer.PriceDimensions) != 1 {
					log.Fatalln("OpenSearch Pricing data has more than one price dimension for on demand", offer.SKU, instance["instance_type"])
				}
				var priceDimension awsutils.RegionPriceDimension
				for _, priceDimension = range offer.PriceDimensions {
					// Intentionally empty - this just gets the first one
				}

				// Handle getting the on demand pricing
				pricing := instance["pricing"].(map[string]*genericAwsPricingData)
				pricingData, ok := pricing[rawRegion.RegionName]
				if !ok {
					pricingData = &genericAwsPricingData{
						Reserved: make(map[string]float64),
					}
					pricing[rawRegion.RegionName] = pricingData
				}
				usd := priceDimension.PricePerUnit[currency]
				if usd != "" {
					usdF := awsutils.Floaty(usd)
					if usdF != 0 {
						pricingData.OnDemand = usdF
					}
				}
			}
		}

		// Handle the reserved pricing
		for _, offerMapping := range rawRegion.RegionData.Terms.Reserved {
			for _, offer := range offerMapping {
				instance, ok := sku2Instance[offer.SKU]
				if !ok {
					continue
				}

				processGenericHalfReservedOffer(offer, func() *genericAwsPricingData {
					pricing := instance["pricing"].(map[string]*genericAwsPricingData)
					pricingData, ok := pricing[rawRegion.RegionName]
					if !ok {
						pricingData = &genericAwsPricingData{
							Reserved: make(map[string]float64),
						}
						pricing[rawRegion.RegionName] = pricingData
					}
					return pricingData
				}, currency)
			}
		}

		// Handle the description
		if regionDescription == "" {
			log.Fatalln("OpenSearch Region description missing for", rawRegion.RegionName)
		} else {
			regionDescriptions[rawRegion.RegionName] = regionDescription
		}
	}

	// Add savings plans pricing
	for region, skuMap := range savingsPlan() {
		for sku, termMap := range skuMap {
			instance, ok := sku2Instance[sku]
			if !ok {
				continue
			}
			for term, price := range termMap {
				regionMap := instance["pricing"].(map[string]*genericAwsPricingData)[region]
				if regionMap == nil {
					regionMap = &genericAwsPricingData{
						Reserved: make(map[string]float64),
					}
					instance["pricing"].(map[string]*genericAwsPricingData)[region] = regionMap
				}
				regionMap.Reserved[term] = price
			}
		}
	}

	// Clean up empty regions and set the regions map for non-empty regions
	for _, instance := range instancesHashmap {
		instance["regions"] = clearHalfEmptyRegions(instance["pricing"].(map[string]*genericAwsPricingData), regionDescriptions)
	}

	// Process the volume quotas
	for instanceType, extraAttributes := range volumeQuotasGetter() {
		instance, ok := instancesHashmap[instanceType]
		if !ok {
			continue
		}
		for k, v := range extraAttributes {
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
	fp := "www/opensearch/instances.json"
	if china {
		fp = "www/opensearch/instances-cn.json"
	}
	utils.SaveInstances(instancesSorted, fp)
}
