package gcp

import "testing"

// TestProcessGCPDataM4Ultramem224Pricing verifies the end-to-end synthesis for
// m4-ultramem-224, the only M4 shape billed under its own dedicated
// "M4Ultramem224 Instance Core/Ram" SKU pair (with matching Spot and CUD
// variants) rather than the plain "M4 Instance Core/Ram" rates shared by every
// other M4 shape. It also asserts the plain M4 rates still price m4-megamem-28
// and never leak into the ultramem-224 bucket (or vice versa).
//
// The M4Ultramem224 Ram SKUs are cataloged per decimal GB ("GBy.h"), unlike
// almost every other RAM SKU (including plain M4's) which is per binary GiB
// ("GiBy.h"); calculateHourlyPrice's gibPerDecimalGB scaling is what makes the
// on-demand total below land exactly on Google's published
// us-central1 price (41.464125836).
func TestProcessGCPDataM4Ultramem224Pricing(t *testing.T) {
	const region = "us-central1" // resolved via the multi-americas region list

	// Live us-central1/Americas rates for M4Ultramem224.
	core := 0.02317
	ramPerGB := 0.00567588
	spotCore := 0.00924
	spotRamPerGB := 0.002265
	cud1Core := 0.0136703
	cud1RamPerGB := 0.0033487700
	cud3Core := 0.006951
	cud3RamPerGB := 0.00170276

	// Live us-central1/Americas rates for plain M4 (per binary GiB already).
	m4Core := 0.0182784
	m4Ram := 0.00457

	skus := []SKU{
		multiRegionalSKU("m4um224-core", "M4Ultramem224 Instance Core running in Americas"),
		multiRegionalSKU("m4um224-ram", "M4Ultramem224 Instance Ram running in Americas"),
		multiRegionalSKU("m4um224-spot-core", "Spot Preemptible M4Ultramem224 Instance Core running in Americas"),
		multiRegionalSKU("m4um224-spot-ram", "Spot Preemptible M4Ultramem224 Instance Ram running in Americas"),
		multiRegionalSKU("m4um224-cud1-core", "Commitment v1: M4Ultramem224 Cpu in Americas for 1 Year"),
		multiRegionalSKU("m4um224-cud1-ram", "Commitment v1: M4Ultramem224 Ram in Americas for 1 Year"),
		multiRegionalSKU("m4um224-cud3-core", "Commitment v1: M4Ultramem224 Cpu in Americas for 3 Years"),
		multiRegionalSKU("m4um224-cud3-ram", "Commitment v1: M4Ultramem224 Ram in Americas for 3 Years"),
		// Plain M4, shared by every non-ultramem-224 M4 shape. Must not be
		// conflated with the M4Ultramem224 bucket above.
		multiRegionalSKU("m4-core", "M4 Instance Core running in Americas"),
		multiRegionalSKU("m4-ram", "M4 Instance Ram running in Americas"),
	}

	pricing := map[string]PriceInfo{
		"m4um224-core":      usdRate("h", core),
		"m4um224-ram":       usdRate("gby.h", ramPerGB),
		"m4um224-spot-core": usdRate("h", spotCore),
		"m4um224-spot-ram":  usdRate("gby.h", spotRamPerGB),
		"m4um224-cud1-core": usdRate("h", cud1Core),
		"m4um224-cud1-ram":  usdRate("gby.h", cud1RamPerGB),
		"m4um224-cud3-core": usdRate("h", cud3Core),
		"m4um224-cud3-ram":  usdRate("gby.h", cud3RamPerGB),
		"m4-core":           usdRate("h", m4Core),
		"m4-ram":            usdRate("giby.h", m4Ram),
	}

	const ultramemVCPU, ultramemMemGB = 224, 5952.0
	const megamemVCPU, megamemMemGB = 28, 372.0
	machineSpecs := map[string]*MachineSpecs{
		"m4-ultramem-224": {VCPU: ultramemVCPU, MemoryGB: ultramemMemGB, Family: "Memory optimized"},
		"m4-megamem-28":   {VCPU: megamemVCPU, MemoryGB: megamemMemGB, Family: "Memory optimized"},
	}

	regions := map[string]string{region: "Iowa"}

	instances := processGCPData(skus, pricing, machineSpecs, regions)

	gibPerGB := 1073741824.0 / 1e9

	ultramem, ok := instances["m4-ultramem-224"]
	if !ok {
		t.Fatalf("expected m4-ultramem-224 instance to be built")
	}
	ultramemLinux := linuxPricing(t, ultramem, region)

	wantOnDemand := ultramemVCPU*core + ultramemMemGB*ramPerGB*gibPerGB
	wantSpot := ultramemVCPU*spotCore + ultramemMemGB*spotRamPerGB*gibPerGB
	wantCUD1Yr := ultramemVCPU*cud1Core + ultramemMemGB*cud1RamPerGB*gibPerGB
	wantCUD3Yr := ultramemVCPU*cud3Core + ultramemMemGB*cud3RamPerGB*gibPerGB

	assertPrice(t, "m4-ultramem-224 ondemand", ultramemLinux.OnDemand, wantOnDemand)
	assertPrice(t, "m4-ultramem-224 spot", ultramemLinux.Spot, wantSpot)
	assertPrice(t, "m4-ultramem-224 cud_1yr", ultramemLinux.CUD1Yr, wantCUD1Yr)
	assertPrice(t, "m4-ultramem-224 cud_3yr", ultramemLinux.CUD3Yr, wantCUD3Yr)

	// Google's published us-central1 on-demand price for m4-ultramem-224.
	assertPrice(t, "m4-ultramem-224 ondemand vs published price", ultramemLinux.OnDemand, 41.464125836)

	// m4-megamem-28 must still be priced from the plain M4 rates, not the
	// M4Ultramem224 bucket.
	megamem, ok := instances["m4-megamem-28"]
	if !ok {
		t.Fatalf("expected m4-megamem-28 instance to be built")
	}
	megamemLinux := linuxPricing(t, megamem, region)
	wantMegamem := megamemVCPU*m4Core + megamemMemGB*m4Ram
	assertPrice(t, "m4-megamem-28 ondemand", megamemLinux.OnDemand, wantMegamem)

	// m4-megamem-28 has no CUD/Spot fixtures of its own in this test (only
	// the plain M4 on-demand SKUs above), so those fields must stay unset --
	// proof the M4Ultramem224 CUD/Spot buckets did not leak into it.
	if megamemLinux.Spot != "" {
		t.Errorf("m4-megamem-28 spot = %q, want empty", megamemLinux.Spot)
	}
	if megamemLinux.CUD1Yr != "" || megamemLinux.CUD3Yr != "" {
		t.Errorf("m4-megamem-28 CUD = (%q, %q), want empty", megamemLinux.CUD1Yr, megamemLinux.CUD3Yr)
	}
}
