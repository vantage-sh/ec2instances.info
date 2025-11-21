package aws

import (
	"log"
	"scraper/aws/awsutils"
	"strings"
)

func cleanEmptyRegions(pricing map[string]map[string]any, regionDescriptions map[string]string) map[string]string {
	for region, regionData := range pricing {
		okOsCount := 0
		for os, osData := range regionData {
			switch v := osData.(type) {
			case *genericAwsPricingData:
				if v.OnDemand == 0 && len(v.Reserved) == 0 {
					// Remove this OS from the instance
					delete(regionData, os)
				} else {
					// Keep this OS
					okOsCount++
				}
			default:
				okOsCount++
			}
		}
		if okOsCount == 0 {
			delete(pricing, region)
		}
	}
	regions := make(map[string]string)
	for region := range pricing {
		regions[region] = regionDescriptions[region]
	}
	return regions
}

func processGenericHalfReservedOffer(offer awsutils.RegionTerm, getPricingData func() *genericAwsPricingData, currency string) {
	termCode := translateGenericAwsReservedTermAttributes(offer.TermAttributes)
	for _, offer := range offer.PriceDimensions {
		descLower := strings.ToLower(offer.Description)
		for _, chunk := range BAD_DESCRIPTION_CHUNKS {
			if strings.Contains(descLower, chunk) {
				// Skip these for now
				return
			}
		}

		usd := offer.PricePerUnit[currency]
		if usd != "" && usd != "0" {
			f := awsutils.Floaty(usd)
			switch termCode {
			case "yrTerm1Standard.partialUpfront", "yrTerm1Standard.allUpfront":
				f = f / 365 / 24
			case "yrTerm3Standard.partialUpfront", "yrTerm3Standard.allUpfront":
				f = f / (365 * 3) / 24
			}
			if f != 0 {
				getPricingData().Reserved[termCode] = f
			}
		} else {
			log.Fatalln("Reserved pricing data has no price", offer)
		}
	}
}

func clearHalfEmptyRegions(pricing map[string]*genericAwsPricingData, regionDescriptions map[string]string) map[string]string {
	for region, regionData := range pricing {
		if regionData.OnDemand == 0 && len(regionData.Reserved) == 0 {
			// Remove this region
			delete(pricing, region)
		}
	}
	regions := make(map[string]string)
	for region := range pricing {
		regions[region] = regionDescriptions[region]
	}
	return regions
}
