package awsutils

import (
	"log"
	"scraper/utils"
	"strings"
	"sync"
)

// RDS for SQL Server "Optimized CPU" (unbundled) families bill the Windows + SQL
// Server license separately from the compute price, via the
// AmazonRDSOCPULicenseFees offer (productFamily "Optimized License"). The license
// is priced per vCPU-hour, fixed per SQL Server edition per region.
//
// For each edition AWS exposes two usage types that both apply:
//   - SQLServerLicenseUsage: the SQL Server edition license (Web/Standard/Enterprise)
//   - WindowsOSLicenseUsage:  the Windows OS license (same rate across editions)
//
// The product's `operation` attribute (CreateDBInstance:00NN) carries the engine
// code NN (11 Web, 12 Standard, 15 Enterprise), which is the same engine code the
// AmazonRDS pricing data is keyed by. We sum the two usage types into a single
// per-vCPU-hour license rate keyed by engine code.

const (
	rdsLicenseProductFamily   = "Optimized License"
	rdsLicenseOperationPrefix = "CreateDBInstance:"
)

// rdsLicenseUsageTypes are the usage types whose rates sum into the total license
// surcharge for an unbundled SQL Server instance.
var rdsLicenseUsageTypes = map[string]bool{
	"SQLServerLicenseUsage": true,
	"WindowsOSLicenseUsage": true,
}

// engineCode is the AmazonRDS engine code (e.g. "12" for SQL Server Standard).
type engineCode = string

// rdsLicenseIndexRegion mirrors one region entry in the offer's region index.
type rdsLicenseIndexRegion struct {
	RegionCode        string `json:"regionCode"`
	CurrentVersionUrl string `json:"currentVersionUrl"`
}

type rdsLicenseRegionIndex struct {
	Regions map[string]rdsLicenseIndexRegion `json:"regions"`
}

func processRdsLicenseRegion(
	regionName string,
	data RegionData,
	currency string,
	write func(regionSlug, engineCode, float64),
) {
	for sku, product := range data.Products {
		if product.ProductFamily != rdsLicenseProductFamily {
			continue
		}

		usageType := product.Attributes["usagetype"]
		if !rdsLicenseUsageTypes[usageType] {
			continue
		}

		operation := product.Attributes["operation"]
		code, ok := strings.CutPrefix(operation, rdsLicenseOperationPrefix)
		if !ok {
			continue
		}
		// "0012" -> "12". The AmazonRDS engine code has no leading zeros.
		code = strings.TrimLeft(code, "0")
		if code == "" {
			continue
		}

		offers, ok := data.Terms.OnDemand[sku]
		if !ok {
			continue
		}
		for _, offer := range offers {
			for _, pd := range offer.PriceDimensions {
				priceStr := pd.PricePerUnit[currency]
				if priceStr == "" {
					continue
				}
				write(regionName, code, Floaty(priceStr))
			}
		}
	}
}

// GetRdsLicenseFees fetches the AmazonRDSOCPULicenseFees offer and returns a getter
// for a map of region -> SQL Server engine code -> total license rate per vCPU-hour
// (SQL Server license + Windows OS license summed). currentRegionIndexUrl may be
// empty (e.g. AWS China does not offer unbundled instances), in which case the
// getter returns an empty map.
func GetRdsLicenseFees(baseUrl, currentRegionIndexUrl string, isChina bool) func() map[regionSlug]map[engineCode]float64 {
	currency := "USD"
	if isChina {
		currency = "CNY"
	}

	m := make(map[regionSlug]map[engineCode]float64)
	mu := sync.Mutex{}
	write := func(region regionSlug, code engineCode, rate float64) {
		mu.Lock()
		defer mu.Unlock()
		codeMap, ok := m[region]
		if !ok {
			codeMap = make(map[engineCode]float64)
			m[region] = codeMap
		}
		// Two usage types (SQL Server + Windows) sum into the per-vCPU rate.
		codeMap[code] += rate
	}

	return utils.BlockUntilDone(func() map[regionSlug]map[engineCode]float64 {
		if currentRegionIndexUrl == "" {
			return m
		}

		var regionIndex rdsLicenseRegionIndex
		if err := loadAwsUrlJson(baseUrl, currentRegionIndexUrl, &regionIndex); err != nil {
			log.Fatal(err)
		}

		var fg utils.FunctionGroup
		for regionName, regionMeta := range regionIndex.Regions {
			fg.Add(func() {
				var data RegionData
				if err := loadAwsUrlJson(baseUrl, regionMeta.CurrentVersionUrl, &data); err != nil {
					log.Fatal(err)
				}
				processRdsLicenseRegion(regionName, data, currency, write)
			})
		}
		fg.Run()
		return m
	})
}
