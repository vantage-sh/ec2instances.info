package ec2

import (
	"fmt"
	"log"
	"regexp"
	"scraper/aws/awsutils"
	"strings"

	"github.com/anaskhan96/soup"
)

func formatPrice(price float64) string {
	dp := fmt.Sprintf("%.6f", price)
	dp = strings.TrimRight(dp, "0")
	dp = strings.TrimRight(dp, ".")
	return dp
}

func capitalize(s string) string {
	return strings.ToUpper(s[:1]) + s[1:]
}

func translateReservedTermAttributes(termAttributes map[string]string) string {
	leaseContractLength := termAttributes["LeaseContractLength"]
	purchaseOption := termAttributes["PurchaseOption"]
	offeringClass := termAttributes["OfferingClass"]

	lease := awsutils.LEASES[leaseContractLength]
	option := awsutils.PURCHASE_OPTIONS[purchaseOption]

	if lease == "" || option == "" || offeringClass == "" {
		log.Fatalln("EC2 Reserved pricing data makes unknown term code", termAttributes)
	}

	return lease + capitalize(offeringClass) + "." + option
}

var RE_REPLACE = regexp.MustCompile(`\*\d$`)

func toText(node soup.Root) string {
	text := strings.TrimSpace(node.FullText())
	text = RE_REPLACE.ReplaceAllString(text, "")
	return strings.TrimSpace(text)
}

func cleanEmptyRegions(pricing map[string]map[string]any, regionDescriptions map[string]string) map[string]string {
	for region, regionData := range pricing {
		okOsCount := 0
		for os, osData := range regionData {
			switch v := osData.(type) {
			case *EC2PricingData:
				if v.OnDemand == "0" && v.Reserved != nil && len(*v.Reserved) == 0 {
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
