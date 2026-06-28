package aws

import (
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

// approxEqual is defined in reserved_pricing_test.go (same package).

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

	// Reported scrape-abort scenario: an unbundled SQL Server SKU (db.r8i.2xlarge
	// Web, engineCode 11) in a region whose AmazonRDSOCPULicenseFees offer publishes
	// no rate for that edition. This must NOT abort the scrape (previously a
	// log.Fatalln) and must NOT store a base-only price (which would reintroduce
	// #890). The edition is omitted, so the stored On Demand price stays 0.
	noRateForWeb := map[engineCode]float64{
		"12": 0.120 + 0.046, // Standard only; no "11" (Web) entry
	}
	r8iWebAttrs := map[string]string{
		"instanceType":    "db.r8i.2xlarge",
		"databaseEngine":  "SQL Server",
		"databaseEdition": "Web",
		"licenseModel":    "License included",
		"engineCode":      "11",
		"vcpu":            "8",
	}
	gotR8iWeb := assembleOnDemand(r8iWebAttrs, "0.500", map[string]bool{"db.r8i.2xlarge": true}, noRateForWeb)
	if gotR8iWeb != 0 {
		t.Errorf("unbundled db.r8i.2xlarge SQL Server Web with no license rate On Demand = %v, want 0 (omitted)", gotR8iWeb)
	}
}

// TestUnbundledSqlServerLicenseSurcharge checks the surcharge helper in isolation,
// including that non-SQL-Server and non-unbundled instances get no surcharge.
func TestUnbundledSqlServerLicenseSurcharge(t *testing.T) {
	licenseRates := map[engineCode]float64{"12": 0.166}
	unbundled := map[string]bool{"db.m7i.2xlarge": true}

	cases := []struct {
		name   string
		attrs  map[string]string
		want   float64
		wantOk bool
	}{
		{
			name: "unbundled sql server standard license included",
			attrs: map[string]string{
				"databaseEngine": "SQL Server", "licenseModel": "License included", "engineCode": "12", "vcpu": "4",
			},
			want:   4 * 0.166,
			wantOk: true,
		},
		{
			name: "unbundled sql server byom sku is not surcharged",
			attrs: map[string]string{
				"databaseEngine": "SQL Server", "licenseModel": "Bring your own media", "engineCode": "52", "vcpu": "4",
			},
			want:   0,
			wantOk: true,
		},
		{
			name: "non-sql-server engine on unbundled type",
			attrs: map[string]string{
				"databaseEngine": "PostgreSQL", "licenseModel": "No license required", "engineCode": "14", "vcpu": "4",
			},
			want:   0,
			wantOk: true,
		},
		{
			// Unbundled, License-included edition AWS publishes no license rate for
			// in this region: surcharge is unknowable, so ok must be false (caller
			// omits the price) and this must NOT abort the scrape.
			name: "unbundled sql server license included with no rate is skipped",
			attrs: map[string]string{
				"databaseEngine": "SQL Server", "licenseModel": "License included", "engineCode": "11", "vcpu": "8",
			},
			want:   0,
			wantOk: false,
		},
	}

	for _, c := range cases {
		got, ok := unbundledSqlServerLicenseSurcharge(c.attrs, "db.m7i.2xlarge", unbundled, licenseRates)
		if !approxEqual(got, c.want) || ok != c.wantOk {
			t.Errorf("%s: surcharge = (%v, %v), want (%v, %v)", c.name, got, ok, c.want, c.wantOk)
		}
	}

	// A SQL Server instance that is NOT unbundled gets no surcharge and proceeds.
	got, ok := unbundledSqlServerLicenseSurcharge(
		map[string]string{"databaseEngine": "SQL Server", "licenseModel": "License included", "engineCode": "12", "vcpu": "8"},
		"db.m5.2xlarge",
		unbundled,
		licenseRates,
	)
	if got != 0 || !ok {
		t.Errorf("bundled SQL Server surcharge = (%v, %v), want (0, true)", got, ok)
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

// newVcpuInstance builds a minimal instance map shaped like the scraper produces,
// with vcpu stored as an Averager of strings.
func newVcpuInstance(instanceType string, vcpus ...string) map[string]any {
	avg := &awsutils.Averager[string]{}
	*avg = append(*avg, vcpus...)
	return map[string]any{
		"instance_type": instanceType,
		"vcpu":          avg,
	}
}

func vcpuValue(t *testing.T, instance map[string]any) string {
	t.Helper()
	avg, ok := instance["vcpu"].(*awsutils.Averager[string])
	if !ok {
		t.Fatalf("vcpu is not an *Averager: %T", instance["vcpu"])
	}
	return avg.Value()
}

func TestAddRdsVcpuByEngine(t *testing.T) {
	instance := newVcpuInstance("db.m7i.2xlarge", "8")

	// Live AWS pricing data reports different vCPU counts for the same RDS
	// instance type depending on database engine. SQL Server has
	// hyper-threading disabled, while other engines keep the EC2-style value.
	addRdsVcpuByEngine(instance, map[string]string{
		"databaseEngine": "MySQL",
		"engineCode":     "2",
		"vcpu":           "8",
	})
	addRdsVcpuByEngine(instance, map[string]string{
		"databaseEngine": "SQL Server",
		"engineCode":     "12",
		"vcpu":           "4",
	})

	if got := vcpuValue(t, instance); got != "8" {
		t.Errorf("top-level vcpu = %q, want 8", got)
	}

	vcpuByEngine, ok := instance["vcpu_by_engine"].(map[string]string)
	if !ok {
		t.Fatalf("vcpu_by_engine is not a map: %T", instance["vcpu_by_engine"])
	}

	for engine, want := range map[string]string{
		"MySQL":      "8",
		"2":          "8",
		"SQL Server": "4",
		"12":         "4",
	} {
		if got := vcpuByEngine[engine]; got != want {
			t.Errorf("vcpu_by_engine[%q] = %q, want %q", engine, got, want)
		}
	}
}
