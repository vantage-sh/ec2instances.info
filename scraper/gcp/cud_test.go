package gcp

import (
	"strconv"
	"testing"
)

// usdRate builds a USD per-hour rate PriceInfo for a single tier-0 list price.
func usdRate(unit string, dollars float64) PriceInfo {
	units := int64(dollars)
	nanos := int64((dollars - float64(units)) * 1e9)
	return PriceInfo{
		CurrencyCode: "USD",
		ValueType:    "rate",
		Rate: Rate{
			Tiers: []Tier{
				{
					StartAmount: Money{},
					ListPrice:   Money{Units: strconv.FormatInt(units, 10), Nanos: nanos},
				},
			},
			Unit: UnitInfo{Unit: unit},
		},
	}
}

func cudSKU(id, displayName string, regions []string) SKU {
	return SKU{
		SkuId:       id,
		DisplayName: displayName,
		GeoTaxonomy: GeoTaxonomy{Regions: regions},
	}
}

func onDemandSKU(id, displayName string, regions []string) SKU {
	return SKU{
		SkuId:       id,
		DisplayName: displayName,
		GeoTaxonomy: GeoTaxonomy{Regions: regions},
	}
}

func TestParseCUDSKU(t *testing.T) {
	cases := []struct {
		display      string
		wantFamily   string
		wantResource string
		wantTerm     string
		wantOK       bool
	}{
		{"Commitment v1: N2 Cpu in Americas for 1 Year", "N2", "core", cudTerm1Yr, true},
		{"Commitment v1: N2 Ram in Americas for 3 Year", "N2", "ram", cudTerm3Yr, true},
		{"Commitment v1: C2D AMD Cpu in EMEA for 1 Year", "C2D", "core", cudTerm1Yr, true},
		{"Commitment v1: C2D AMD Ram in EMEA for 3 Year", "C2D", "ram", cudTerm3Yr, true},
		// On-demand and spot SKUs must NOT be treated as CUD.
		{"N2 Instance Core running in Americas", "", "", "", false},
		{"Spot Preemptible N2 Instance Ram running in Paris", "", "", "", false},
		// Spend-based / flexible CUDs are not resource-based and must be ignored.
		{"Commitment - dollar based v1: GCE for 1 year", "", "", "", false},
	}

	for _, tc := range cases {
		family, resource, term, ok := parseCUDSKU(SKU{DisplayName: tc.display})
		if ok != tc.wantOK {
			t.Errorf("%q: ok=%v want %v", tc.display, ok, tc.wantOK)
			continue
		}
		if !tc.wantOK {
			continue
		}
		if family != tc.wantFamily || resource != tc.wantResource || term != tc.wantTerm {
			t.Errorf("%q: got (%s,%s,%s) want (%s,%s,%s)",
				tc.display, family, resource, term,
				tc.wantFamily, tc.wantResource, tc.wantTerm)
		}
	}
}

// TestProcessGCPDataCUDPricing verifies the end-to-end CUD assembly:
// per-instance 1yr/3yr CUD = core_rate*vCPU + ram_rate*RAM, sourced from the
// committed-use SKUs the scraper previously discarded. It also asserts CUD
// rates never leak into on-demand pricing.
func TestProcessGCPDataCUDPricing(t *testing.T) {
	const region = "us-central1"

	// On-demand rates (so the instance has a baseline price in the region).
	odCore := 0.031611
	odRam := 0.004237

	// Committed-use 1yr and 3yr per-core / per-RAM-GB rates.
	cud1Core := 0.019915
	cud1Ram := 0.002669
	cud3Core := 0.014225
	cud3Ram := 0.001907

	skus := []SKU{
		onDemandSKU("od-core", "N2 Instance Core running in Iowa", []string{region}),
		onDemandSKU("od-ram", "N2 Instance Ram running in Iowa", []string{region}),
		cudSKU("cud1-core", "Commitment v1: N2 Cpu in Americas for 1 Year", []string{region}),
		cudSKU("cud1-ram", "Commitment v1: N2 Ram in Americas for 1 Year", []string{region}),
		cudSKU("cud3-core", "Commitment v1: N2 Cpu in Americas for 3 Year", []string{region}),
		cudSKU("cud3-ram", "Commitment v1: N2 Ram in Americas for 3 Year", []string{region}),
	}

	pricing := map[string]PriceInfo{
		"od-core":   usdRate("h", odCore),
		"od-ram":    usdRate("giby.h", odRam),
		"cud1-core": usdRate("h", cud1Core),
		"cud1-ram":  usdRate("giby.h", cud1Ram),
		"cud3-core": usdRate("h", cud3Core),
		"cud3-ram":  usdRate("giby.h", cud3Ram),
	}

	const vcpu = 8
	const memGB = 32.0
	machineSpecs := map[string]*MachineSpecs{
		"n2-standard-8": {
			VCPU:     vcpu,
			MemoryGB: memGB,
			Family:   "General purpose",
		},
	}

	regions := map[string]string{region: "Iowa"}

	instances := processGCPData(skus, pricing, machineSpecs, regions)

	inst, ok := instances["n2-standard-8"]
	if !ok {
		t.Fatalf("expected n2-standard-8 instance to be built")
	}

	regionPricing, ok := inst.Pricing[region]
	if !ok {
		t.Fatalf("expected pricing for region %s", region)
	}
	linux, ok := regionPricing["linux"].(*GCPPricingData)
	if !ok {
		t.Fatalf("expected linux pricing data")
	}

	wantOnDemand := float64(vcpu)*odCore + memGB*odRam
	want1Yr := float64(vcpu)*cud1Core + memGB*cud1Ram
	want3Yr := float64(vcpu)*cud3Core + memGB*cud3Ram

	assertPrice(t, "ondemand", linux.OnDemand, wantOnDemand)
	assertPrice(t, "cud_1yr", linux.CUD1Yr, want1Yr)
	assertPrice(t, "cud_3yr", linux.CUD3Yr, want3Yr)

	// CUD rates must be a real discount below on-demand and must not have
	// leaked into the on-demand field.
	if want1Yr >= wantOnDemand || want3Yr >= want1Yr {
		t.Errorf("expected 3yr < 1yr < ondemand, got ondemand=%f 1yr=%f 3yr=%f",
			wantOnDemand, want1Yr, want3Yr)
	}
}

func assertPrice(t *testing.T, label, got string, want float64) {
	t.Helper()
	if got == "" {
		t.Errorf("%s: empty, want %s", label, formatPrice(want))
		return
	}
	gotF, err := strconv.ParseFloat(got, 64)
	if err != nil {
		t.Errorf("%s: parse %q: %v", label, got, err)
		return
	}
	if diff := gotF - want; diff > 1e-6 || diff < -1e-6 {
		t.Errorf("%s: got %f want %f", label, gotF, want)
	}
}
