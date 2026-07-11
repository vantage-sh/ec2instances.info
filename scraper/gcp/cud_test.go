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
		{"Commitment v1: M4Ultramem224 Cpu in Americas for 1 Year", "M4ULTRAMEM224", "core", cudTerm1Yr, true},
		{"Commitment v1: M4Ultramem224 Ram in Americas for 3 Year", "M4ULTRAMEM224", "ram", cudTerm3Yr, true},
		// Legacy first-generation commitment naming carries no family token; C2
		// and M1 are recovered from the "Compute optimized" / "Memory-optimized"
		// wording (mirroring the on-demand legacySKURegex). "3 Years" (plural) is
		// the live term wording and must parse identically to "3 Year".
		{"Commitment v1: Compute optimized Cpu in Iowa for 1 Year", "C2", "core", cudTerm1Yr, true},
		{"Commitment v1: Compute optimized Ram in Berlin for 3 Years", "C2", "ram", cudTerm3Yr, true},
		{"Commitment v1: Memory-optimized Cpu in Frankfurt for 1 Year", "M1", "core", cudTerm1Yr, true},
		{"Commitment v1: Memory-optimized Ram in Americas for 3 Years", "M1", "ram", cudTerm3Yr, true},
		// C2 also uses a second, version-less spelling ("Commitment:" with no
		// version, "Core"/"Ram" not "Cpu", "running in" not "in") that covers the
		// major regions -- including the multi-Americas grouping that resolves to
		// us-central1. Both spellings must map to C2.
		{"Commitment: Compute optimized Core running in Americas for 1 Year", "C2", "core", cudTerm1Yr, true},
		{"Commitment: Compute optimized Ram running in Americas for 3 Year", "C2", "ram", cudTerm3Yr, true},
		{"Commitment: Compute optimized Core running in Frankfurt for 1 Year", "C2", "core", cudTerm1Yr, true},
		// The M2 Upgrade Premium has no commitment variant in the catalog; a
		// premium-worded commitment must never be attributed to M1's CUD bucket.
		{"Commitment v1: Memory Optimized Upgrade Premium for Memory-optimized Instance Cpu in Americas for 1 Year", "", "", "", false},
		// On-demand and spot SKUs must NOT be treated as CUD.
		{"N2 Instance Core running in Americas", "", "", "", false},
		{"Spot Preemptible N2 Instance Ram running in Paris", "", "", "", false},
		// Spend-based / flexible CUDs are not resource-based and must be ignored.
		{"Commitment - dollar based v1: GCE for 1 year", "", "", "", false},
		// Local SSD commitments are handled by parseLocalSSDCommitmentSKU, not here.
		{"Commitment v1: Z3 Local SSD in Iowa for 1 Year", "", "", "", false},
		// g4 is excluded from the CUD allowlist (its instances publish no
		// core+RAM price for a commitment to attach to), so its resource
		// commitment SKU must no longer parse.
		{"Commitment v1: G4 Cpu in Americas for 1 Year", "", "", "", false},
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

// TestParseLocalSSDCommitmentSKU covers the two Local SSD commitment display
// forms (generic and family-scoped) with both terms, and asserts that the vGPU
// variant, resource CUDs, on-demand SSD SKUs, and reservation SKUs are excluded.
func TestParseLocalSSDCommitmentSKU(t *testing.T) {
	cases := []struct {
		display    string
		wantFamily string
		wantTerm   string
		wantOK     bool
	}{
		{"Commitment v1: Local SSD in Iowa for 1 Year", "", cudTerm1Yr, true},
		{"Commitment v1: Local SSD in Americas for 3 Years", "", cudTerm3Yr, true},
		{"Commitment v1: Z3 Local SSD in Alabama for 3 Years", "Z3", cudTerm3Yr, true},
		{"Commitment v1: C4A Local SSD in Frankfurt for 1 Year", "C4A", cudTerm1Yr, true},
		{"Commitment v1: H4D Local SSD in Iowa for 3 Years", "H4D", cudTerm3Yr, true},
		// The vGPU G4 Local SSD commitment is ignored, mirroring the on-demand
		// path which likewise skips the vGPU twin of the G4 Local SSD SKU.
		{"Commitment v1: vGPU G4 Local SSD in Iowa for 1 Year", "", "", false},
		// Resource CUDs, on-demand SSD SKUs, and reservation SKUs must not match.
		{"Commitment v1: N2 Cpu in Americas for 1 Year", "", "", false},
		{"Z3 Instance Local SSD running in Netherlands", "", "", false},
		{"Reserved C4A Standard Local SSD in Iowa for 1 Year", "", "", false},
	}

	for _, tc := range cases {
		family, term, ok := parseLocalSSDCommitmentSKU(SKU{DisplayName: tc.display})
		if ok != tc.wantOK {
			t.Errorf("%q: ok=%v want %v", tc.display, ok, tc.wantOK)
			continue
		}
		if !tc.wantOK {
			continue
		}
		if family != tc.wantFamily || term != tc.wantTerm {
			t.Errorf("%q: got (family=%s, term=%s) want (family=%s, term=%s)",
				tc.display, family, term, tc.wantFamily, tc.wantTerm)
		}
	}
}

// TestProcessGCPDataLegacyCUDPricing proves the legacy-named C2 and M1
// commitment SKUs (no family token) now yield cud_1yr, where before the fix they
// fell through unparsed and those shapes carried no CUD price at all. It uses the
// real multi-Americas grammar: C2 in the version-less "Commitment: Compute
// optimized Core running in Americas" spelling and M1 in the "Commitment v1:
// Memory-optimized Cpu in Americas" spelling, and asserts the CUD lands on
// us-central1 via the multi-Americas expansion (the region with no per-region C2
// commitment SKU, which the version-less form is the only source for).
func TestProcessGCPDataLegacyCUDPricing(t *testing.T) {
	const region = "us-central1" // resolved via the multi-americas expansion

	c2odCore, c2odRam := 0.03398, 0.00455
	c2cudCore, c2cudRam := 0.021414, 0.002869
	m1odCore, m1odRam := 0.0348, 0.0051
	m1cudCore, m1cudRam := 0.021924, 0.003213

	skus := []SKU{
		multiRegionalSKU("c2-od-core", "Compute optimized Core running in Americas"),
		multiRegionalSKU("c2-od-ram", "Compute optimized Ram running in Americas"),
		multiRegionalSKU("c2-cud-core", "Commitment: Compute optimized Core running in Americas for 1 Year"),
		multiRegionalSKU("c2-cud-ram", "Commitment: Compute optimized Ram running in Americas for 1 Year"),
		multiRegionalSKU("m1-od-core", "Memory-optimized Instance Core running in Americas"),
		multiRegionalSKU("m1-od-ram", "Memory-optimized Instance Ram running in Americas"),
		multiRegionalSKU("m1-cud-core", "Commitment v1: Memory-optimized Cpu in Americas for 1 Year"),
		multiRegionalSKU("m1-cud-ram", "Commitment v1: Memory-optimized Ram in Americas for 1 Year"),
	}

	pricing := map[string]PriceInfo{
		"c2-od-core":  usdRate("h", c2odCore),
		"c2-od-ram":   usdRate("giby.h", c2odRam),
		"c2-cud-core": usdRate("h", c2cudCore),
		"c2-cud-ram":  usdRate("giby.h", c2cudRam),
		"m1-od-core":  usdRate("h", m1odCore),
		"m1-od-ram":   usdRate("giby.h", m1odRam),
		"m1-cud-core": usdRate("h", m1cudCore),
		"m1-cud-ram":  usdRate("giby.h", m1cudRam),
	}

	machineSpecs := map[string]*MachineSpecs{
		"c2-standard-8": {VCPU: 8, MemoryGB: 32.0, Family: "Compute optimized"},
		"m1-megamem-96": {VCPU: 96, MemoryGB: 1433.6, Family: "Memory optimized"},
	}

	instances := processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Iowa"})

	c2 := linuxPricing(t, mustInstance(t, instances, "c2-standard-8"), region)
	assertPrice(t, "c2 cud_1yr", c2.CUD1Yr, 8*c2cudCore+32.0*c2cudRam)

	m1 := linuxPricing(t, mustInstance(t, instances, "m1-megamem-96"), region)
	assertPrice(t, "m1 cud_1yr", m1.CUD1Yr, 96*m1cudCore+1433.6*m1cudRam)
}

// TestProcessGCPDataC2InstanceRegionPricing proves the per-region C2 spelling
// ("Compute optimized Instance Core/Ram running in <City>", plus its Spot twin)
// now yields an on-demand/spot baseline, which in turn lets the per-region C2
// commitment SKUs attach a CUD. Before the fix the "Instance" token defeated
// legacySKURegex, so these 12 newer regions had neither on-demand nor CUD.
// Rates are the live africa-south1 (Johannesburg) commitment rates; the assert
// reproduces the triage anchor c2-standard-16 cud_1yr = 0.578784.
func TestProcessGCPDataC2InstanceRegionPricing(t *testing.T) {
	const region = "africa-south1"

	odCore, odRam := 0.03654, 0.004896
	spotCore, spotRam := 0.011, 0.0015
	cudCore, cudRam := 0.02355, 0.003156

	skus := []SKU{
		onDemandSKU("c2-od-core", "Compute optimized Instance Core running in Johannesburg", []string{region}),
		onDemandSKU("c2-od-ram", "Compute optimized Instance Ram running in Johannesburg", []string{region}),
		onDemandSKU("c2-spot-core", "Spot Preemptible Compute optimized Instance Core running in Johannesburg", []string{region}),
		onDemandSKU("c2-spot-ram", "Spot Preemptible Compute optimized Instance Ram running in Johannesburg", []string{region}),
		cudSKU("c2-cud-core", "Commitment v1: Compute optimized Cpu in Johannesburg for 1 Year", []string{region}),
		cudSKU("c2-cud-ram", "Commitment v1: Compute optimized Ram in Johannesburg for 1 Year", []string{region}),
	}

	pricing := map[string]PriceInfo{
		"c2-od-core":   usdRate("h", odCore),
		"c2-od-ram":    usdRate("giby.h", odRam),
		"c2-spot-core": usdRate("h", spotCore),
		"c2-spot-ram":  usdRate("giby.h", spotRam),
		"c2-cud-core":  usdRate("h", cudCore),
		"c2-cud-ram":   usdRate("giby.h", cudRam),
	}

	machineSpecs := map[string]*MachineSpecs{
		"c2-standard-16": {VCPU: 16, MemoryGB: 64.0, Family: "Compute optimized"},
	}

	instances := processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Johannesburg"})
	c2 := linuxPricing(t, mustInstance(t, instances, "c2-standard-16"), region)

	assertPrice(t, "c2 ondemand", c2.OnDemand, 16*odCore+64.0*odRam)
	assertPrice(t, "c2 spot", c2.Spot, 16*spotCore+64.0*spotRam)
	assertPrice(t, "c2 cud_1yr (anchor 0.578784)", c2.CUD1Yr, 16*cudCore+64.0*cudRam)
}

// TestProcessGCPDataM2CUDPricing proves M2 CUD is synthesized as the M1
// commitment core/RAM rates plus the on-demand Upgrade Premium (the premium has
// no commitment variant), and that M2 CUD is absent when the premium is absent.
func TestProcessGCPDataM2CUDPricing(t *testing.T) {
	const region = "us-central1"

	baseCore, baseRam := 0.0348, 0.0051
	m1cudCore, m1cudRam := 0.021924, 0.003213
	premCore, premRam := 0.004524, 0.000663

	const m2VCPU, m2MemGB = 208, 5888.0

	build := func(withPremium bool) []SKU {
		skus := []SKU{
			multiRegionalSKU("m1-core", "Memory-optimized Instance Core running in Americas"),
			multiRegionalSKU("m1-ram", "Memory-optimized Instance Ram running in Americas"),
			multiRegionalSKU("m1-cud-core", "Commitment v1: Memory-optimized Cpu in Americas for 1 Year"),
			multiRegionalSKU("m1-cud-ram", "Commitment v1: Memory-optimized Ram in Americas for 1 Year"),
		}
		if withPremium {
			skus = append(skus,
				multiRegionalSKU("prem-core", "Memory Optimized Upgrade Premium for Memory-optimized Instance Core running in Americas"),
				multiRegionalSKU("prem-ram", "Memory Optimized Upgrade Premium for Memory-optimized Instance Ram running in Americas"),
			)
		}
		return skus
	}

	pricing := map[string]PriceInfo{
		"m1-core":     usdRate("h", baseCore),
		"m1-ram":      usdRate("giby.h", baseRam),
		"m1-cud-core": usdRate("h", m1cudCore),
		"m1-cud-ram":  usdRate("giby.h", m1cudRam),
		"prem-core":   usdRate("h", premCore),
		"prem-ram":    usdRate("giby.h", premRam),
	}

	machineSpecs := map[string]*MachineSpecs{
		"m2-ultramem-208": {VCPU: m2VCPU, MemoryGB: m2MemGB, Family: "Memory optimized"},
	}
	regions := map[string]string{region: "Iowa"}

	// Premium present: M2 CUD = (M1 commitment + on-demand premium) rates.
	withPrem := processGCPData(build(true), pricing, machineSpecs, regions)
	m2 := linuxPricing(t, mustInstance(t, withPrem, "m2-ultramem-208"), region)
	wantCUD := m2VCPU*(m1cudCore+premCore) + m2MemGB*(m1cudRam+premRam)
	assertPrice(t, "m2 cud_1yr", m2.CUD1Yr, wantCUD)
	if m2.CUD3Yr != "" {
		t.Errorf("m2 cud_3yr = %q, want empty (no 3yr commitment SKU)", m2.CUD3Yr)
	}

	// Premium absent: M2 has neither on-demand nor CUD, so no CUD price surfaces.
	noPrem := processGCPData(build(false), pricing, machineSpecs, regions)
	if inst, ok := noPrem["m2-ultramem-208"]; ok {
		if linux, ok := inst.Pricing[region]["linux"].(*GCPPricingData); ok && (linux.CUD1Yr != "" || linux.CUD3Yr != "") {
			t.Errorf("m2 CUD without premium = (%q, %q), want empty", linux.CUD1Yr, linux.CUD3Yr)
		}
	}
}

// TestProcessGCPDataSSDCUDPricing proves the bundled Local SSD commitment rate
// is folded into a shape's CUD price with family-specific-then-generic
// precedence: a Z3 shape uses the Z3-scoped SSD commitment SKU while a C3 shape
// (no C3-specific SSD commitment) falls back to the generic one.
func TestProcessGCPDataSSDCUDPricing(t *testing.T) {
	const region = "us-central1"

	// Core/RAM rates (on-demand for a baseline price, commitment for the CUD).
	z3odCore, z3odRam := 0.03398, 0.00455
	z3cudCore, z3cudRam := 0.021414, 0.002869
	c3odCore, c3odRam := 0.03398, 0.00455
	c3cudCore, c3cudRam := 0.021414, 0.002869

	// SSD commitment rates (per GiB-month). The Z3-specific rate differs from
	// the generic one to prove precedence; C3 has no specific SKU so it uses
	// the generic rate.
	z3ssdMonthly := 0.048
	genericSSDMonthly := 0.064

	const z3VCPU, z3MemGB, z3SSDGB = 88, 704.0, 36000
	const c3VCPU, c3MemGB, c3SSDGB = 8, 32.0, 750

	skus := []SKU{
		onDemandSKU("z3-od-core", "Z3 Instance Core running in Iowa", []string{region}),
		onDemandSKU("z3-od-ram", "Z3 Instance Ram running in Iowa", []string{region}),
		cudSKU("z3-cud-core", "Commitment v1: Z3 Cpu in Iowa for 1 Year", []string{region}),
		cudSKU("z3-cud-ram", "Commitment v1: Z3 Ram in Iowa for 1 Year", []string{region}),
		cudSKU("z3-ssd-cud", "Commitment v1: Z3 Local SSD in Iowa for 1 Year", []string{region}),
		onDemandSKU("c3-od-core", "C3 Instance Core running in Iowa", []string{region}),
		onDemandSKU("c3-od-ram", "C3 Instance Ram running in Iowa", []string{region}),
		cudSKU("c3-cud-core", "Commitment v1: C3 Cpu in Iowa for 1 Year", []string{region}),
		cudSKU("c3-cud-ram", "Commitment v1: C3 Ram in Iowa for 1 Year", []string{region}),
		cudSKU("generic-ssd-cud", "Commitment v1: Local SSD in Iowa for 1 Year", []string{region}),
	}

	pricing := map[string]PriceInfo{
		"z3-od-core":      usdRate("h", z3odCore),
		"z3-od-ram":       usdRate("giby.h", z3odRam),
		"z3-cud-core":     usdRate("h", z3cudCore),
		"z3-cud-ram":      usdRate("giby.h", z3cudRam),
		"z3-ssd-cud":      usdRate("giby.mo", z3ssdMonthly),
		"c3-od-core":      usdRate("h", c3odCore),
		"c3-od-ram":       usdRate("giby.h", c3odRam),
		"c3-cud-core":     usdRate("h", c3cudCore),
		"c3-cud-ram":      usdRate("giby.h", c3cudRam),
		"generic-ssd-cud": usdRate("giby.mo", genericSSDMonthly),
	}

	machineSpecs := map[string]*MachineSpecs{
		"z3-highmem-88-highlssd": {VCPU: z3VCPU, MemoryGB: z3MemGB, Family: "Storage optimized", LocalSSDGB: z3SSDGB},
		"c3-standard-8-lssd":     {VCPU: c3VCPU, MemoryGB: c3MemGB, Family: "Compute optimized", LocalSSDGB: c3SSDGB},
	}

	instances := processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Iowa"})

	z3 := linuxPricing(t, mustInstance(t, instances, "z3-highmem-88-highlssd"), region)
	wantZ3 := z3VCPU*z3cudCore + z3MemGB*z3cudRam + z3SSDGB*(z3ssdMonthly/730)
	assertPrice(t, "z3 cud_1yr (family-specific SSD)", z3.CUD1Yr, wantZ3)

	c3 := linuxPricing(t, mustInstance(t, instances, "c3-standard-8-lssd"), region)
	wantC3 := c3VCPU*c3cudCore + c3MemGB*c3cudRam + c3SSDGB*(genericSSDMonthly/730)
	assertPrice(t, "c3 cud_1yr (generic SSD)", c3.CUD1Yr, wantC3)
}

func mustInstance(t *testing.T, instances map[string]*GCPInstance, name string) *GCPInstance {
	t.Helper()
	inst, ok := instances[name]
	if !ok {
		t.Fatalf("expected %s instance to be built", name)
	}
	return inst
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
