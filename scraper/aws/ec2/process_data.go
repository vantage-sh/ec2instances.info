package ec2

import (
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"sort"
	"strconv"
	"strings"

	"github.com/anaskhan96/soup"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

type ec2DataGetters struct {
	spotDataPartialGetter func() *spotDataPartial
	t2HtmlGetter          func() *soup.Root
}

var EC2_OK_PRODUCT_FAMILIES = map[string]bool{
	"Compute Instance":              true,
	"Compute Instance (bare metal)": true,
	"Dedicated Host":                true,
}

var EC2_ADD_METAL = map[string]bool{
	"u-6tb1":  true,
	"u-9tb1":  true,
	"u-12tb1": true,
}

type ec2SkuData struct {
	instance      *EC2Instance
	platform      string
	hasBoxUsage   bool
	region        string
	onDemandPrice float64
}

func processEC2Data(
	inData chan awsutils.RawRegion,
	ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo],
	china bool,
	getters ec2DataGetters,
) {
	// Defines the currency
	currency := "USD"
	if china {
		currency = "CNY"
	}

	// Data that is used throughout the process
	instancesHashmap := make(map[string]*EC2Instance)
	sku2SkuData := make(map[string]ec2SkuData)

	// EBS gp3 storage SKUs and the resulting per-region rate.
	// Used to populate costPerGb.regions so a user-selected storage
	// amount above the bundled instance-store baseline is priced as
	// attached gp3 EBS.
	ebsGp3Skus := make(map[string]bool)
	gp3RatePerRegion := make(map[string]float64)

	// The descriptions found for each region
	regionDescriptions := make(map[string]string)

	// Process each region as it comes in
	var savingsPlanData func() map[string]map[string]map[string]float64
	for rawRegion := range inData {
		// Close the channel when we're done
		if rawRegion.SavingsPlanData != nil {
			savingsPlanData = rawRegion.SavingsPlanData
			close(inData)
			break
		}

		// Process the products in the region
		regionDescription := ""
		for _, product := range rawRegion.RegionData.Products {
			// Capture EBS gp3 storage SKUs before the family filter so
			// they survive into the OnDemand pass below. Only the gp3
			// volume type is used; other volume types are ignored.
			if product.ProductFamily == "Storage" &&
				product.Attributes["volumeApiName"] == "gp3" {
				ebsGp3Skus[product.SKU] = true
				continue
			}

			if _, ok := EC2_OK_PRODUCT_FAMILIES[product.ProductFamily]; !ok {
				continue
			}

			instanceType := product.Attributes["instanceType"]
			if instanceType == "" {
				continue
			}

			location := product.Attributes["location"]
			if location != "" {
				if regionDescription != "" && regionDescription != location {
					log.Fatalln("EC2 Region description mismatch", regionDescription, location, "for", instanceType)
				}
				regionDescription = location
			}

			if _, ok := EC2_ADD_METAL[instanceType]; ok {
				instanceType = instanceType + ".metal"
			}

			pieces := strings.Split(instanceType, ".")
			if len(pieces) == 1 {
				// Dedicated host that is not u-*.metal, skipping
				// May be a good idea to all dedicated hosts in the future
				continue
			}

			instance := instancesHashmap[instanceType]
			if instance == nil {
				instance = &EC2Instance{
					InstanceType:             instanceType,
					Pricing:                  make(map[Region]map[OS]any),
					LinuxVirtualizationTypes: []string{},
					VpcOnly:                  true,
					PlacementGroupSupport:    true,
					IPV6Support:              true,

					// TODO: Figure out why this is always empty in Python code, and
					// make a fixed version for here
					AvailabilityZones: make(map[string][]string),
				}
				instance.addExtraDetails()
				instancesHashmap[instanceType] = instance
			}

			platform := awsutils.TranslatePlatformName(
				product.Attributes["operatingSystem"],
				product.Attributes["preInstalledSw"],
			)
			if platform != "" && shouldIncludeEC2PricingSku(platform, product.Attributes["licenseModel"]) {
				sku2SkuData[product.SKU] = ec2SkuData{
					instance:    instance,
					platform:    platform,
					hasBoxUsage: strings.Contains(product.Attributes["usagetype"], "BoxUsage"),
					region:      rawRegion.RegionName,
				}
			}

			enrichEc2Instance(instance, product.Attributes, ec2ApiResponses)
		}

		// Gets the pricing data for the region/platform. Creates if it doesn't exist.
		getPricingData := func(instance *EC2Instance, platform string) *EC2PricingData {
			regionMap := instance.Pricing[rawRegion.RegionName]
			if regionMap == nil {
				regionMap = make(map[OS]any)
				instance.Pricing[rawRegion.RegionName] = regionMap
			}
			osMap := regionMap[platform]
			if osMap == nil {
				m := make(map[string]string)
				osMap = &EC2PricingData{
					Reserved: &m,
					OnDemand: "0",
				}
				regionMap[platform] = osMap
			}
			return osMap.(*EC2PricingData)
		}

		// Process the on demand pricing
		for _, offerMapping := range rawRegion.RegionData.Terms.OnDemand {
			for _, offer := range offerMapping {
				// EBS gp3 storage SKU: extract the per-GB-month rate
				// for this region. Take the lowest tier (BeginRange == "0").
				if ebsGp3Skus[offer.SKU] {
					for _, dim := range offer.PriceDimensions {
						if !strings.EqualFold(dim.Unit, "GB-Mo") {
							continue
						}
						if dim.BeginRange != "" && dim.BeginRange != "0" {
							continue
						}
						priceStr := dim.PricePerUnit[currency]
						if priceStr == "" {
							continue
						}
						rate, err := strconv.ParseFloat(priceStr, 64)
						if err != nil || rate <= 0 {
							continue
						}
						if existing, ok := gp3RatePerRegion[rawRegion.RegionName]; !ok || rate < existing {
							gp3RatePerRegion[rawRegion.RegionName] = rate
						}
					}
					continue
				}

				// Get the instance in question
				skuData, ok := sku2SkuData[offer.SKU]
				if !ok {
					continue
				}
				instance := skuData.instance
				platform := skuData.platform

				if !skuData.hasBoxUsage {
					// This is a magic thing that breaks pricing. Ignore anything with it.
					continue
				}

				// Get the price dimension
				if len(offer.PriceDimensions) != 1 {
					log.Fatalln("EC2 Pricing data has more than one price dimension for on demand", offer.SKU, instance.InstanceType)
				}
				var priceDimension awsutils.RegionPriceDimension
				for _, priceDimension = range offer.PriceDimensions {
					// Intentionally empty - this just gets the first one
				}

				// Get the price
				if priceDimension.PricePerUnit != nil {
					usd, ok := priceDimension.PricePerUnit[currency]
					if ok {
						usdFloat, err := strconv.ParseFloat(usd, 64)
						if err != nil {
							log.Fatalln(
								"Unable to parse EC2 pricing data for",
								offer.SKU,
								instance.InstanceType,
								priceDimension.PricePerUnit,
							)
						}
						pricingData := getPricingData(instance, platform)
						if usdFloat == 0 {
							// No such thing as a free lunch
							continue
						}
						old, err := strconv.ParseFloat(pricingData.OnDemand, 64)
						if err != nil && pricingData.OnDemand != "" {
							log.Fatalln("Unable to parse EC2 pricing data for", offer.SKU, instance.InstanceType, pricingData.OnDemand)
						}
						if old < usdFloat {
							pricingData.OnDemand = formatPrice(usdFloat)
						}
						skuData.onDemandPrice = usdFloat
						sku2SkuData[offer.SKU] = skuData
					}
				}
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

				if !skuData.hasBoxUsage {
					// This is a magic thing that breaks pricing. Ignore anything with it.
					continue
				}

				pricingData := getPricingData(skuData.instance, skuData.platform)
				if !skuOnDemandMatchesPlatform(skuData.onDemandPrice, pricingData.OnDemand) {
					continue
				}

				// Process this reserved offer
				processReservedOffer(
					pricingData,
					offer.PriceDimensions,
					offer.TermAttributes,
					currency,
				)
			}
		}

		// Set the region description
		if regionDescription == "" {
			log.Fatalln("EC2 Region description missing for", rawRegion.RegionName)
		} else {
			regionDescriptions[rawRegion.RegionName] = regionDescription
		}
	}

	// Add spot pricing if not China
	if !china {
		addSpotPricing(instancesHashmap, regionDescriptions)
	}

	// Add EBS pricing if not China
	if !china {
		addEBSPricing(instancesHashmap, currency)
	}

	// Add T2 credits
	addT2Credits(instancesHashmap, getters.t2HtmlGetter)

	// Invert the regions map
	regionsInverted := make(map[string]string)
	for region, regionName := range regionDescriptions {
		regionsInverted[regionName] = region
	}

	// Some hacks to make some AWS API expectations work
	if !china {
		regionsInverted["AWS GovCloud (US)"] = "us-gov-west-1"
		regionsInverted["EU (Spain)"] = "eu-south-2"
		regionsInverted["EU (Zurich)"] = "eu-central-2"
	}

	// Add EMR pricing
	if china {
		addEmrPricingCn(instancesHashmap, regionsInverted)
	} else {
		addEmrPricingUs(instancesHashmap, regionsInverted)
	}

	// Add GPU information
	addGpuInfo(instancesHashmap)

	// Add FPGA information for instances AWS does not report via the API
	addFpgaInfo(instancesHashmap)

	// Add instance store random read/write IOPS from the AWS instance-type docs
	addStorageIopsInfo(instancesHashmap)

	// Add placement group information
	addPlacementGroupInfo(instancesHashmap)

	// Add dedicated host pricing
	if china {
		addDedicatedHostPricingCn(instancesHashmap, regionsInverted)
	} else {
		addDedicatedHostPricingUs(instancesHashmap, regionsInverted)
	}

	// Add spot interrupt information
	addSpotInterruptInfo(instancesHashmap, getters.spotDataPartialGetter, china)

	// Add Linux AMI info
	addLinuxAmiInfo(instancesHashmap)

	// Add VPC only instances
	addVpcOnlyInstances(instancesHashmap)

	// Add date introduced from instancetyp.es timeline
	addDateIntroduced(instancesHashmap)

	// Add savings plans pricing
	for region, skuMap := range savingsPlanData() {
		for sku, termMap := range skuMap {
			skuInfo, ok := sku2SkuData[sku]
			if !ok {
				continue
			}
			for term, price := range termMap {
				regionPricing, ok := skuInfo.instance.Pricing[region]
				if !ok {
					regionPricing = make(map[OS]any)
					skuInfo.instance.Pricing[region] = regionPricing
				}
				osPricing, ok := regionPricing[skuInfo.platform]
				if !ok {
					osPricing = &EC2PricingData{
						Reserved: &map[string]string{},
						OnDemand: "0",
					}
					regionPricing[skuInfo.platform] = osPricing
				}
				pricingData := osPricing.(*EC2PricingData)
				if !skuOnDemandMatchesPlatform(skuInfo.onDemandPrice, pricingData.OnDemand) {
					continue
				}
				if pricingData.Reserved == nil {
					m := make(map[string]string)
					pricingData.Reserved = &m
				}
				(*pricingData.Reserved)[term] = formatPrice(price)
			}
		}
	}

	// Build the costPerGb.regions map once; the gp3 rate applies to
	// every EC2 instance equally (it's the rate of an attached EBS
	// volume, not something that varies per instance type).
	costPerGbRegions := make(map[string]any, len(gp3RatePerRegion))
	for region, rate := range gp3RatePerRegion {
		costPerGbRegions[region] = rate
	}

	// Clean up empty regions and set the regions map for non-empty regions
	for _, instance := range instancesHashmap {
		instance.Regions = cleanEmptyRegions(instance.Pricing, regionDescriptions)

		// Populate costPerGb so storage is expressed separately from
		// compute. Baseline is the total instance-store capacity in GB
		// (free with the instance); regions[r] is the per-GB-month gp3
		// EBS rate for additional storage beyond the baseline.
		var totalGb float64 = 0
		if instance.Storage != nil {
			totalGb = float64(instance.Storage.Size * instance.Storage.Devices)
		}
		// Copy so each instance has an independent map (the value in the
		// json is per-instance-shaped even though the rates are shared).
		regionsCopy := make(map[string]any, len(costPerGbRegions))
		for k, v := range costPerGbRegions {
			regionsCopy[k] = v
		}
		instance.CostPerGb = &CostPerGb{
			Baseline: totalGb,
			Regions:  regionsCopy,
		}
	}

	// Save the instances
	sortedInstances := make([]*EC2Instance, 0, len(instancesHashmap))
	for _, instance := range instancesHashmap {
		sortedInstances = append(sortedInstances, instance)
	}
	sort.Slice(sortedInstances, func(i, j int) bool {
		return sortedInstances[i].InstanceType < sortedInstances[j].InstanceType
	})
	fp := "www/instances.json"
	if china {
		fp = "www/instances-cn.json"
	}
	utils.SaveInstances(sortedInstances, fp)
}
