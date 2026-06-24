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

// hoursInReservedTerm returns the number of hours in the lease for a reserved
// term code (e.g. "yrTerm1Standard.allUpfront" -> 1 year). It is used to
// amortize the one-time upfront fee into an effective hourly rate.
func hoursInReservedTerm(termCode string) int {
	switch {
	case strings.HasPrefix(termCode, "yrTerm1"):
		return 1 * 365 * 24
	case strings.HasPrefix(termCode, "yrTerm3"):
		return 3 * 365 * 24
	default:
		log.Fatalln("Reserved pricing data has unknown lease length", termCode)
		return 0
	}
}

// effectiveReservedHourly combines a reserved offer's recurring hourly fee
// (Unit == "Hrs") with its one-time upfront fee (any other unit, e.g.
// "Quantity") into a single effective hourly rate, amortizing the upfront fee
// over the lease. This mirrors how EC2 reserved pricing is computed and ensures
// Partial Upfront rates are not understated by dropping the hourly fee. It
// returns -1 if the offer should be skipped (a description chunk was filtered).
func effectiveReservedHourly(offer awsutils.RegionTerm, termCode, currency string) float64 {
	hourlyPrice := 0.0
	upfrontPrice := 0.0
	for _, priceDimension := range offer.PriceDimensions {
		descLower := strings.ToLower(priceDimension.Description)
		for _, chunk := range BAD_DESCRIPTION_CHUNKS {
			if strings.Contains(descLower, chunk) {
				// Skip these for now
				return -1
			}
		}

		usd := priceDimension.PricePerUnit[currency]
		if usd == "" {
			log.Fatalln("Reserved pricing data has no price", priceDimension)
		}
		f := awsutils.Floaty(usd)
		if priceDimension.Unit == "Hrs" {
			hourlyPrice = f
		} else {
			upfrontPrice = f
		}
	}
	return hourlyPrice + upfrontPrice/float64(hoursInReservedTerm(termCode))
}

func processGenericHalfReservedOffer(offer awsutils.RegionTerm, getPricingData func() *genericAwsPricingData, currency string) {
	termCode := translateGenericAwsReservedTermAttributes(offer.TermAttributes)
	effectiveHourly := effectiveReservedHourly(offer, termCode, currency)
	if effectiveHourly <= 0 {
		return
	}
	getPricingData().Reserved[termCode] = effectiveHourly
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
