package aws

import (
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"sort"
	"strings"
)

var IGNORE_REDSHIFT_ATTRIBUTES = map[string]bool{
	"location":     true,
	"locationType": true,
	"operation":    true,
	"region":       true,
	"usagetype":    true,
}

var REDSHIFT_FAMILY_NAMES = map[string]string{
	"dc2": "Dense Compute DC2",
	"ra3": "Managed Storage",
	"dc1": "Dense Compute",
	"ds1": "Dense Storage",
	"ds2": "Dense Storage DS2",
}

func enrichRedshiftInstance(instance map[string]any, attributes map[string]string) {
	// Clean up the memory attribute
	if attributes["memory"] != "" {
		attributes["memory"] = strings.Split(attributes["memory"], " ")[0]
	}
	attributes["family"] = attributes["usageFamily"]

	// Copy them into the instance
	for k, v := range attributes {
		if _, ok := IGNORE_REDSHIFT_ATTRIBUTES[k]; !ok && v != "NA" {
			instance[k] = v
		}
	}

	// Add the pretty name
	if _, ok := instance["pretty_name"]; !ok {
		instance["pretty_name"] = awsutils.AddPrettyName(instance["instance_type"].(string), REDSHIFT_FAMILY_NAMES)
	}
}

func processRedshiftOnDemandDimension(priceDimension awsutils.RegionPriceDimension, getPricingData func() *genericAwsPricingData, currency string) {
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
	pricingData := getPricingData()
	pricingData.OnDemand = usdF
}

const REDSHIFT_NODE_PARAMETERS_URL = "https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html"

func getRedshiftNodeParameters() map[string]map[string]string {
	m := make(map[string]map[string]string)

	doc, err := utils.LoadHTML(REDSHIFT_NODE_PARAMETERS_URL)
	if err != nil {
		log.Fatalln("Error loading Redshift node parameters", err)
	}

	tableContainers := doc.FindAll("div", "class", "table-container")
	if len(tableContainers) < 2 {
		log.Fatalln("Not enough table containers found for Redshift node parameters", len(tableContainers))
	}
	for i, tableContainer := range tableContainers {
		if i == 2 {
			// We only want the first 2
			break
		}

		table := tableContainer.Find("table")
		if table.Error != nil {
			log.Fatalln("Error finding Redshift node parameters table", table.Error)
		}

		tbody := table.Find("tbody")
		if tbody.Error != nil {
			log.Fatalln("Error finding Redshift node parameters tbody", tbody.Error)
		}

		trs := tbody.FindAll("tr")
		for _, tr := range trs {
			tds := tr.FindAll("td")

			instanceType := strings.TrimSpace(tds[0].FullText())
			isMultiNode := strings.Contains(instanceType, "multi-node")
			instanceType = strings.Split(instanceType, " ")[0]
			if instanceType == "" {
				continue
			}

			slices := strings.TrimSpace(tds[3].FullText())
			perNodeStorage := strings.TrimSpace(tds[4].FullText())
			nodeRange := strings.TrimSpace(tds[5].FullText())
			storageCap := strings.TrimSpace(tds[6].FullText())

			ma, ok := m[instanceType]
			if !ok {
				ma = make(map[string]string)
				m[instanceType] = ma
			}

			if isMultiNode {
				ma["multi-node_node_range"] = nodeRange
				ma["multi-node_storage_capacity"] = storageCap
			}

			ma["slices_per_node"] = slices
			ma["storage_per_node"] = perNodeStorage
			ma["node_range"] = nodeRange
			ma["storage_capacity"] = storageCap
		}
	}

	return m
}

func processRedshiftData(
	inData chan awsutils.RawRegion,
	china bool,
	redshiftNodeParametersGetter func() map[string]map[string]string,
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
			if product.ProductFamily != "Compute Instance" {
				continue
			}

			instanceType := product.Attributes["instanceType"]
			if instanceType == "" {
				continue
			}

			location := product.Attributes["location"]
			if location != "" {
				if regionDescription != "" && regionDescription != location {
					log.Fatalln("Redshift Region description mismatch", regionDescription, location, "for", instanceType)
				}
				regionDescription = location
			}

			instance, ok := instancesHashmap[instanceType]
			if !ok {
				instance = map[string]any{
					"instance_type": instanceType,
					"pricing":       make(map[string]*genericAwsPricingData),
				}
				instancesHashmap[instanceType] = instance
			}
			sku2Instance[product.SKU] = instance
			enrichRedshiftInstance(instance, product.Attributes)
		}

		// Gets the pricing data.
		getPricingData := func(instance map[string]any) *genericAwsPricingData {
			regionMap := instance["pricing"].(map[string]*genericAwsPricingData)[rawRegion.RegionName]
			if regionMap == nil {
				regionMap = &genericAwsPricingData{
					Reserved: make(map[string]float64),
				}
				instance["pricing"].(map[string]*genericAwsPricingData)[rawRegion.RegionName] = regionMap
			}
			return regionMap
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
					log.Fatalln("Redshift Pricing data has more than one price dimension for on demand", offer.SKU, instance["instance_type"])
				}
				var priceDimension awsutils.RegionPriceDimension
				for _, priceDimension = range offer.PriceDimensions {
					// Intentionally empty - this just gets the first one
				}

				// Process the on demand pricing
				getPricingDataScoped := func() *genericAwsPricingData {
					return getPricingData(instance)
				}
				processRedshiftOnDemandDimension(priceDimension, getPricingDataScoped, currency)
			}
		}

		// Process the reserved pricing
		for _, offerMapping := range rawRegion.RegionData.Terms.Reserved {
			for _, offer := range offerMapping {
				// Get the instance in question
				instance, ok := sku2Instance[offer.SKU]
				if !ok {
					continue
				}

				// Process the reserved pricing
				getPricingDataScoped := func() *genericAwsPricingData {
					return getPricingData(instance)
				}
				processGenericHalfReservedOffer(offer, getPricingDataScoped, currency)
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

	// Set the node parameters
	for instanceType, nodeParameters := range redshiftNodeParametersGetter() {
		instance, ok := instancesHashmap[instanceType]
		if !ok {
			continue
		}
		for k, v := range nodeParameters {
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
	fp := "www/redshift/instances.json"
	if china {
		fp = "www/redshift/instances-cn.json"
	}
	utils.SaveInstances(instancesSorted, fp)
}
