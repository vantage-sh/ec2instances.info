package awsutils

import (
	"math"
	"testing"
)

func approxEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

// TestProcessRdsLicenseRegionPrefixedUsageType reproduces the scrape-abort bug:
// AWS prefixes the OCPU license usagetype with a region billing code in every
// region except us-east-1 (e.g. "EU-SQLServerLicenseUsage"). The previous
// exact-string match captured rates only for us-east-1, leaving every other
// region with an empty license-rate map and aborting the scrape on the first
// unbundled SQL Server "License included" SKU it found there. The rates must be
// read regardless of the region prefix, and the two usage types must sum.
func TestProcessRdsLicenseRegionPrefixedUsageType(t *testing.T) {
	// Mirrors the eu-west-1 AmazonRDSOCPULicenseFees offer for SQL Server Web
	// (engine code 11): the usagetype carries the "EU-" billing prefix and the two
	// license line items (SQL Server + Windows OS) must be summed.
	data := RegionData{
		Products: map[string]RegionProduct{
			"SKU_SQL_WEB": {
				SKU:           "SKU_SQL_WEB",
				ProductFamily: "Optimized License",
				Attributes: map[string]string{
					"usagetype": "EU-SQLServerLicenseUsage",
					"operation": "CreateDBInstance:0011",
				},
			},
			"SKU_WIN_WEB": {
				SKU:           "SKU_WIN_WEB",
				ProductFamily: "Optimized License",
				Attributes: map[string]string{
					"usagetype": "EU-WindowsOSLicenseUsage",
					"operation": "CreateDBInstance:0011",
				},
			},
			// A non-license product family must be ignored.
			"SKU_OTHER": {
				SKU:           "SKU_OTHER",
				ProductFamily: "Database Instance",
				Attributes: map[string]string{
					"usagetype": "EU-SQLServerLicenseUsage",
					"operation": "CreateDBInstance:0011",
				},
			},
		},
		Terms: RegionTerms{
			OnDemand: map[string]map[string]RegionTerm{
				"SKU_SQL_WEB": {
					"SKU_SQL_WEB.term": {
						PriceDimensions: map[string]RegionPriceDimension{
							"d1": {PricePerUnit: map[string]string{"USD": "0.017"}},
						},
					},
				},
				"SKU_WIN_WEB": {
					"SKU_WIN_WEB.term": {
						PriceDimensions: map[string]RegionPriceDimension{
							"d1": {PricePerUnit: map[string]string{"USD": "0.046"}},
						},
					},
				},
			},
		},
	}

	rates := map[engineCode]float64{}
	processRdsLicenseRegion("eu-west-1", data, "USD", func(_ regionSlug, code engineCode, rate float64) {
		rates[code] += rate
	})

	got, ok := rates["11"]
	if !ok {
		t.Fatalf("engine code 11 (Web) rate missing for eu-west-1 with EU- prefixed usagetype")
	}
	if !approxEqual(got, 0.017+0.046) {
		t.Errorf("eu-west-1 Web license rate = %v, want %v (SQL Server + Windows OS summed)", got, 0.017+0.046)
	}
}

// TestIsRdsLicenseUsageType covers the prefix-tolerant usagetype matcher.
func TestIsRdsLicenseUsageType(t *testing.T) {
	cases := []struct {
		usageType string
		want      bool
	}{
		{"SQLServerLicenseUsage", true},      // us-east-1 (no prefix)
		{"WindowsOSLicenseUsage", true},      // us-east-1 (no prefix)
		{"EU-SQLServerLicenseUsage", true},   // eu-west-1
		{"APN1-WindowsOSLicenseUsage", true}, // ap-northeast-1
		{"USW2-WindowsOSLicenseUsage", true}, // us-west-2
		{"SomethingElse", false},
		{"", false},
		// Must require the "-" separator, not an arbitrary substring/suffix.
		{"XSQLServerLicenseUsage", false},
	}
	for _, c := range cases {
		if got := isRdsLicenseUsageType(c.usageType); got != c.want {
			t.Errorf("isRdsLicenseUsageType(%q) = %v, want %v", c.usageType, got, c.want)
		}
	}
}
