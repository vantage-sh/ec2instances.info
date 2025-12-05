package awsutils

import (
	"log"
	"scraper/utils"
	"strings"
	"sync"
)

type (
	regionSlug = string
	sku        = string
	term       = string
)

func loadAwsUrlJson(baseUrl string, awsUrl string, val any) error {
	if strings.HasPrefix(awsUrl, "/") {
		awsUrl = baseUrl + awsUrl
	}
	return utils.LoadJson(awsUrl, val)
}

func translateReservedTermAttributes(purchaseTerm, purchaseOption string) string {
	lease := LEASES[purchaseTerm]
	option := PURCHASE_OPTIONS[purchaseOption]

	if lease == "" || option == "" {
		log.Fatalln("EC2 savings plan pricing data makes unknown term code", purchaseTerm, purchaseOption)
	}

	return lease + "Savings." + option
}

func processSavingsPlanRegion(
	rawRegion RawSavingsPlanRegion,
	isChina bool,
	write func(sku, term, float64),
) {
	sku2product := make(map[string]map[string]string)
	for _, product := range rawRegion.Products {
		sku2product[product.SKU] = product.Attributes
	}

	for _, t := range rawRegion.Terms.SavingsPlan {
		productAttributes, ok := sku2product[t.SKU]
		if !ok {
			log.Fatalf("Could not find product for savings plan SKU %s", t.SKU)
		}

		purchaseOption := productAttributes["purchaseOption"]
		purchaseTerm := productAttributes["purchaseTerm"]
		termKey := translateReservedTermAttributes(purchaseTerm, purchaseOption)

		for _, rate := range t.Rates {
			price := Floaty(rate.DiscountedRate.Price)
			currency := "USD"
			if isChina {
				currency = "CNY"
			}
			if rate.DiscountedRate.Currency != currency {
				log.Fatalf("Savings plan currency mismatch for SKU %s: expected %s, got %s", t.SKU, currency, rate.DiscountedRate.Currency)
			}

			write(sku(rate.DiscountedSKU), term(termKey), price)
		}
	}
}

type awsSavingsPlanRegion struct {
	RegionCode string `json:"regionCode"`
	VersionUrl string `json:"versionUrl"`
}

type awsSavingsPlansIndexResponse struct {
	Regions []awsSavingsPlanRegion `json:"regions"`
}

func processSavingsPlans(
	baseUrl, currentSavingsPlanIndexUrl string,
	isChina bool,
	write func(regionSlug, sku, term, float64),
) {
	var savingsPlansData awsSavingsPlansIndexResponse
	err := loadAwsUrlJson(baseUrl, currentSavingsPlanIndexUrl, &savingsPlansData)
	if err != nil {
		log.Fatal(err)
	}

	var fg utils.FunctionGroup
	for _, regionMeta := range savingsPlansData.Regions {
		fg.Add(func() {
			var rawRegion RawSavingsPlanRegion
			err := loadAwsUrlJson(baseUrl, regionMeta.VersionUrl, &rawRegion)
			if err != nil {
				log.Fatal(err)
			}

			regionWrite := func(s sku, t term, price float64) {
				write(regionSlug(regionMeta.RegionCode), s, t, price)
			}
			processSavingsPlanRegion(rawRegion, isChina, regionWrite)
		})
	}
	fg.Run()
}

// GetSavingsPlans is used to get the savings plans data for a specific servica/base URL
// Returns a function to get the map of regions to their instances and their savings plans data
func GetSavingsPlans(baseUrl, currentSavingsPlanIndexUrl string, isChina bool) func() map[regionSlug]map[sku]map[term]float64 {
	m := make(map[regionSlug]map[sku]map[term]float64)
	mu := sync.Mutex{}
	write := func(region regionSlug, s sku, t term, price float64) {
		mu.Lock()
		defer mu.Unlock()
		regionMap, ok := m[region]
		if !ok {
			regionMap = make(map[sku]map[term]float64)
			m[region] = regionMap
		}
		instanceMap, ok := regionMap[s]
		if !ok {
			instanceMap = make(map[term]float64)
			regionMap[s] = instanceMap
		}
		instanceMap[t] = price
	}

	return utils.BlockUntilDone(func() map[regionSlug]map[sku]map[term]float64 {
		processSavingsPlans(baseUrl, currentSavingsPlanIndexUrl, isChina, write)
		return m
	})
}
