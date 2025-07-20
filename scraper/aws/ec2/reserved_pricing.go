package ec2

import (
	"log"
	"regexp"
	"scraper/aws/awsutils"
	"strconv"
)

var START_NUMBERS = regexp.MustCompile(`^(\d+)`)

func processReservedOffer(
	pricingData *EC2PricingData,
	priceDimensions map[string]awsutils.RegionPriceDimension,
	termAttributes map[string]string,
	currency string,
) {
	// Go through the price dimensions to get the upfront and hourly prices
	upfrontPrice := 0.0
	pricePerHour := 0.0
	for _, priceDimension := range priceDimensions {
		tempPrice := 0.0
		if priceDimension.PricePerUnit != nil {
			usd, ok := priceDimension.PricePerUnit[currency]
			if ok {
				usdFloat, err := strconv.ParseFloat(usd, 64)
				if err != nil {
					log.Fatalln(
						"Unable to parse EC2 pricing data for",
						priceDimension.PricePerUnit,
					)
				}
				tempPrice = usdFloat
			}
		}

		if priceDimension.Unit == "Hrs" {
			pricePerHour = tempPrice
		} else {
			upfrontPrice = tempPrice
		}
	}

	// Translate the term attributes into a term code
	localTerm := translateReservedTermAttributes(termAttributes)

	// Get the price per hour
	startNumber := START_NUMBERS.FindString(termAttributes["LeaseContractLength"])
	if startNumber == "" {
		log.Fatalln("EC2 Reserved pricing data has no start number", localTerm)
	}
	leaseInYears, err := strconv.Atoi(startNumber)
	if err != nil {
		log.Fatalln("EC2 Reserved pricing data has no start number", localTerm)
	}
	hoursInTerm := leaseInYears * 365 * 24
	finalPrice := pricePerHour + (upfrontPrice / float64(hoursInTerm))

	// Write to the pricing data
	(*pricingData.Reserved)[localTerm] = formatPrice(finalPrice)
}
