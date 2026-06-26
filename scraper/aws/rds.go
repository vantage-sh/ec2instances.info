package aws

import (
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"slices"
	"sort"
	"strconv"
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

var pipeIntoAverager = []string{
	"vcpu",
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
			if slices.Contains(pipeIntoAverager, k) {
				avg, ok := instance[k].(*awsutils.Averager[string])
				if !ok {
					avg = &awsutils.Averager[string]{}
				}
				*avg = append(*avg, v)
				instance[k] = avg
			} else {
				instance[k] = v
			}
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

// SQL_SERVER_REAL_EDITIONS are the SQL Server editions that carry a separately
// billed Windows + SQL Server license on unbundled ("Bring your own media")
// instances. The free Developer/Express editions are excluded - they have no
// license fee in the AmazonRDSOCPULicenseFees offer.
var SQL_SERVER_REAL_EDITIONS = map[string]bool{
	"Standard":   true,
	"Web":        true,
	"Enterprise": true,
}

// isUnbundledSqlServerProduct reports whether a product is a real-edition SQL
// Server "Bring your own media" SKU. The presence of such a SKU for an instance
// type is the definitive signal that the type is an "unbundled" (Optimize CPU)
// family whose license is billed separately - this matches exactly the
// {m7i, m8i, r7i, r8i} families documented by AWS, without hardcoding a list.
func isUnbundledSqlServerProduct(attributes map[string]string) bool {
	return attributes["databaseEngine"] == "SQL Server" &&
		attributes["licenseModel"] == "Bring your own media" &&
		SQL_SERVER_REAL_EDITIONS[attributes["databaseEdition"]]
}

type genericAwsPricingData struct {
	OnDemand float64            `json:"ondemand"`
	Reserved map[string]float64 `json:"reserved"`
}

// unbundledSqlServerLicenseSurcharge returns the per-hour Windows + SQL Server
// license cost to add to the base On-Demand price of an unbundled SQL Server
// instance. The license is priced per vCPU-hour (fixed per edition per region),
// so the surcharge is the per-vCPU rate times the instance's vCPU count.
//
// Only the "License included" SKUs are surcharged - these are the priced
// Web/Standard/Enterprise editions the frontend displays. The "Bring your own
// media" SKUs (which only flag the family as unbundled) carry no AWS-billed
// license and are left untouched.
//
// The second return value is false only when this is a surcharged unbundled
// License-included SKU for which AWS publishes no license rate in this region
// (the AmazonRDSOCPULicenseFees offer covers fewer regions than AmazonRDS, and
// new regions gain unbundled SQL Server before the fee offer catches up). In
// that case the all-in price cannot be computed, so the caller must skip the
// price entirely rather than store a misleadingly cheap base-only number. For
// all non-surcharged SKUs it returns (0, true): no surcharge, proceed normally.
//
// It still fails loud on a surcharged SKU with an unparseable vCPU count, which
// is a genuine data-integrity error rather than an expected coverage gap.
func unbundledSqlServerLicenseSurcharge(
	attributes map[string]string,
	instanceType string,
	unbundledInstanceTypes map[string]bool,
	licenseRates map[engineCode]float64,
) (float64, bool) {
	if attributes["databaseEngine"] != "SQL Server" {
		return 0, true
	}
	if !unbundledInstanceTypes[instanceType] {
		return 0, true
	}
	// Only the displayed "License included" SKU gets the separately-billed license
	// added. BYOM SKUs (and any free Express SKU) are not surcharged.
	if attributes["licenseModel"] != "License included" {
		return 0, true
	}

	code := attributes["engineCode"]
	rate, ok := licenseRates[code]
	if !ok {
		// AWS does not publish a license rate for this edition in this region (the
		// fee offer lags new regions/editions). The all-in price is unknowable, so
		// signal the caller to omit this price rather than abort the scrape or show
		// a base-only price that would reintroduce the under-counting of #890.
		log.Println("Skipping unbundled RDS SQL Server price: no license rate published", instanceType, "engineCode", code)
		return 0, false
	}

	vcpuStr := attributes["vcpu"]
	vcpu, err := strconv.ParseFloat(vcpuStr, 64)
	if err != nil || vcpu == 0 {
		log.Fatalln("Unbundled RDS SQL Server instance has invalid vCPU count", instanceType, "vcpu", vcpuStr)
	}

	return rate * vcpu, true
}

type engineCode = string

func processRdsOnDemandDimension(
	attributes map[string]string,
	instanceType string,
	priceDimension awsutils.RegionPriceDimension,
	getPricingdata func(platform string) *genericAwsPricingData,
	currency string,
	unbundledInstanceTypes map[string]bool,
	licenseRates map[engineCode]float64,
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

	// For unbundled SQL Server instances, the Windows + SQL Server license is a
	// separate AWS line item not present in the base AmazonRDS price. Add it so the
	// displayed cost matches the all-in cost shown for bundled families. If AWS
	// publishes no license rate for this edition/region, the all-in price is
	// unknowable, so omit it rather than store a misleading base-only price.
	surcharge, ok := unbundledSqlServerLicenseSurcharge(attributes, instanceType, unbundledInstanceTypes, licenseRates)
	if !ok {
		return
	}
	usdF += surcharge

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

func processRDSData(
	inData chan awsutils.RawRegion,
	ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo],
	china bool,
	licenseFees func() map[string]map[engineCode]float64,
) {
	// Defines the currency
	currency := "USD"
	if china {
		currency = "CNY"
	}

	// Per-region per-engine-code Windows + SQL Server license rate (per vCPU-hour)
	// for unbundled SQL Server instances. Empty for AWS China (no unbundled offer).
	licenseRatesByRegion := licenseFees()

	// SQL Server "unbundled" (Optimize CPU) instance types, identified by the
	// presence of a real-edition "Bring your own media" SKU.
	unbundledSqlServerInstanceTypes := make(map[string]bool)

	// Data that is used throughout the process
	instancesHashmap := make(map[string]map[string]any)
	sku2SkuData := make(map[string]genericAwsSkuData)

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
			if product.ProductFamily != "Database Instance" {
				continue
			}

			instanceType := product.Attributes["instanceType"]
			if instanceType == "" {
				continue
			}

			// Flag unbundled SQL Server instance types from their BYOM SKUs. This
			// is checked across all deployment options before the Single-AZ filter
			// below, since the BYOM SKU and the priced "License included" SKU are
			// distinct products.
			if isUnbundledSqlServerProduct(product.Attributes) {
				unbundledSqlServerInstanceTypes[instanceType] = true
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
				processRdsOnDemandDimension(
					attributes,
					instance["instance_type"].(string),
					priceDimension,
					getPricingdataScoped,
					currency,
					unbundledSqlServerInstanceTypes,
					licenseRatesByRegion[rawRegion.RegionName],
				)
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

	// Add savings plans pricing
	for region, skuMap := range savingsPlan() {
		for sku, termMap := range skuMap {
			skuInfo, ok := sku2SkuData[sku]
			if !ok {
				continue
			}
			for term, price := range termMap {
				data := []*genericAwsPricingData{
					getgenericAwsPricingData(skuInfo.instance, region, skuInfo.attributes["databaseEngine"]),
					getgenericAwsPricingData(skuInfo.instance, region, skuInfo.attributes["engineCode"]),
				}
				for _, pricingData := range data {
					if pricingData.Reserved == nil {
						pricingData.Reserved = map[string]float64{}
					}
					pricingData.Reserved[term] = price
				}
			}
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
