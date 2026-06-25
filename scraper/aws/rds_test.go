package aws

import (
	"math"
	"testing"

	"scraper/aws/awsutils"
)

// assembleOnDemand runs the real on-demand price-assembly path for a single SQL
// Server SKU and returns the On-Demand price stored for its engine code (which is
// what the frontend "SQL Server <edition> On Demand Cost" column reads).
func assembleOnDemand(
	attributes map[string]string,
	basePrice string,
	unbundled map[string]bool,
	licenseRates map[engineCode]float64,
) float64 {
	instance := map[string]any{
		"pricing": make(map[string]map[string]any),
	}
	getPricing := func(platform string) *genericAwsPricingData {
		return getgenericAwsPricingData(instance, "us-east-1", platform)
	}
	pd := awsutils.RegionPriceDimension{
		Description:  "instance hour running SQL Server",
		PricePerUnit: map[string]string{"USD": basePrice},
	}
	processRdsOnDemandDimension(
		attributes,
		attributes["instanceType"],
		pd,
		getPricing,
		"USD",
		unbundled,
		licenseRates,
	)
	return getPricing(attributes["engineCode"]).OnDemand
}

func approxEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

// TestUnbundledSqlServerLicense replicates the #890 scenario: a db.m7i.2xlarge SQL
// Server Standard "unbundled" instance must display base + separately-billed
// Windows + SQL Server license cost.
//
// Base $0.824/hr (the launch price from #890), 4 vCPU (as AWS reports this type in
// the AmazonRDS offer), license rates per vCPU-hour from the AmazonRDSOCPULicenseFees
// offer: SQL Server Standard $0.120 + Windows OS $0.046 = $0.166, summed in the
// license map keyed by engine code "12". All-in = 0.824 + 4*0.166 = $1.488/hr.
//
// The load-bearing, AWS-verified quantity is the $0.664/hr surcharge (4 * $0.166);
// AWS has since lowered the us-east-1 base to $0.712, but the surcharge logic this
// test exercises is independent of the base price.
func TestUnbundledSqlServerLicense(t *testing.T) {
	// Summed SQL Server + Windows license rate per vCPU-hour, keyed by engine code,
	// as GetRdsLicenseFees produces it from the AmazonRDSOCPULicenseFees offer.
	licenseRates := map[engineCode]float64{
		"11": 0.017 + 0.046, // Web
		"12": 0.120 + 0.046, // Standard
		"15": 0.375 + 0.046, // Enterprise
	}

	unbundled := map[string]bool{
		"db.m7i.2xlarge": true,
	}

	stdAttrs := map[string]string{
		"instanceType":    "db.m7i.2xlarge",
		"databaseEngine":  "SQL Server",
		"databaseEdition": "Standard",
		"licenseModel":    "License included",
		"engineCode":      "12",
		"vcpu":            "4",
	}

	got := assembleOnDemand(stdAttrs, "0.824", unbundled, licenseRates)
	if !approxEqual(got, 1.488) {
		t.Errorf("unbundled db.m7i.2xlarge SQL Server Standard On Demand = %v, want 1.488", got)
	}

	// A bundled / older family (db.m5.2xlarge) is NOT in the unbundled set; its
	// "License included" base price already bakes in the license and must pass
	// through unchanged ($2.548/hr).
	bundledAttrs := map[string]string{
		"instanceType":    "db.m5.2xlarge",
		"databaseEngine":  "SQL Server",
		"databaseEdition": "Standard",
		"licenseModel":    "License included",
		"engineCode":      "12",
		"vcpu":            "8",
	}
	gotBundled := assembleOnDemand(bundledAttrs, "2.548", map[string]bool{}, licenseRates)
	if !approxEqual(gotBundled, 2.548) {
		t.Errorf("bundled db.m5.2xlarge SQL Server Standard On Demand = %v, want 2.548 (unchanged)", gotBundled)
	}
}

// TestUnbundledSqlServerLicenseSurcharge checks the surcharge helper in isolation,
// including that non-SQL-Server and non-unbundled instances get no surcharge.
func TestUnbundledSqlServerLicenseSurcharge(t *testing.T) {
	licenseRates := map[engineCode]float64{"12": 0.166}
	unbundled := map[string]bool{"db.m7i.2xlarge": true}

	cases := []struct {
		name  string
		attrs map[string]string
		want  float64
	}{
		{
			name: "unbundled sql server standard license included",
			attrs: map[string]string{
				"databaseEngine": "SQL Server", "licenseModel": "License included", "engineCode": "12", "vcpu": "4",
			},
			want: 4 * 0.166,
		},
		{
			name: "unbundled sql server byom sku is not surcharged",
			attrs: map[string]string{
				"databaseEngine": "SQL Server", "licenseModel": "Bring your own media", "engineCode": "52", "vcpu": "4",
			},
			want: 0,
		},
		{
			name: "non-sql-server engine on unbundled type",
			attrs: map[string]string{
				"databaseEngine": "PostgreSQL", "licenseModel": "No license required", "engineCode": "14", "vcpu": "4",
			},
			want: 0,
		},
	}

	for _, c := range cases {
		got := unbundledSqlServerLicenseSurcharge(c.attrs, "db.m7i.2xlarge", unbundled, licenseRates)
		if !approxEqual(got, c.want) {
			t.Errorf("%s: surcharge = %v, want %v", c.name, got, c.want)
		}
	}

	// A SQL Server instance that is NOT unbundled gets no surcharge.
	got := unbundledSqlServerLicenseSurcharge(
		map[string]string{"databaseEngine": "SQL Server", "licenseModel": "License included", "engineCode": "12", "vcpu": "8"},
		"db.m5.2xlarge",
		unbundled,
		licenseRates,
	)
	if got != 0 {
		t.Errorf("bundled SQL Server surcharge = %v, want 0", got)
	}
}

// TestIsUnbundledSqlServerProduct verifies the unbundled-detection signal.
func TestIsUnbundledSqlServerProduct(t *testing.T) {
	cases := []struct {
		attrs map[string]string
		want  bool
	}{
		{map[string]string{"databaseEngine": "SQL Server", "licenseModel": "Bring your own media", "databaseEdition": "Standard"}, true},
		{map[string]string{"databaseEngine": "SQL Server", "licenseModel": "Bring your own media", "databaseEdition": "Enterprise"}, true},
		{map[string]string{"databaseEngine": "SQL Server", "licenseModel": "Bring your own media", "databaseEdition": "Web"}, true},
		// Free developer edition: not a license-bearing unbundled product.
		{map[string]string{"databaseEngine": "SQL Server", "licenseModel": "Bring your own media", "databaseEdition": "Enterprise Developer"}, false},
		// Bundled "License included" SKU.
		{map[string]string{"databaseEngine": "SQL Server", "licenseModel": "License included", "databaseEdition": "Standard"}, false},
		// Other engine.
		{map[string]string{"databaseEngine": "PostgreSQL", "licenseModel": "No license required", "databaseEdition": "None"}, false},
	}
	for _, c := range cases {
		if got := isUnbundledSqlServerProduct(c.attrs); got != c.want {
			t.Errorf("isUnbundledSqlServerProduct(%v) = %v, want %v", c.attrs, got, c.want)
		}
	}
}
