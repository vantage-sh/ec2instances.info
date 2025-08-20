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
	instance           *EC2Instance
	platform           string
	hasInstancekuValue bool
}

func processEC2Data(
	inData chan *awsutils.RawRegion,
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

	// The descriptions found for each region
	regionDescriptions := make(map[string]string)

	// Process each region as it comes in
	for rawRegion := range inData {
		// Close the channel when we're done
		if rawRegion == nil {
			close(inData)
			break
		}

		// Process the products in the region
		regionDescription := ""
		for _, product := range rawRegion.RegionData.Products {
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
				instancesHashmap[instanceType] = instance
			}

			platform := awsutils.TranslatePlatformName(
				product.Attributes["operatingSystem"],
				product.Attributes["preInstalledSw"],
			)
			if platform != "" {
				sku2SkuData[product.SKU] = ec2SkuData{
					instance:           instance,
					platform:           platform,
					hasInstancekuValue: product.Attributes["instancesku"] != "",
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
				// Get the instance in question
				skuData, ok := sku2SkuData[offer.SKU]
				if !ok {
					continue
				}
				instance := skuData.instance
				platform := skuData.platform

				if skuData.hasInstancekuValue {
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


				if skuData.hasInstancekuValue {
					// This is a magic thing that breaks pricing. Ignore anything with it.
					continue
				}

				// Process this reserved offer
				processReservedOffer(
					getPricingData(skuData.instance, skuData.platform),
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

	// Clean up empty regions and set the regions map for non-empty regions
	for _, instance := range instancesHashmap {
		instance.Regions = cleanEmptyRegions(instance.Pricing, regionDescriptions)
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
