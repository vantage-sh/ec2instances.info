package gcp

import "testing"

// multiRegionalSKU builds a multi-regional ("running in Americas") SKU with the
// TYPE_MULTI_REGIONAL geo taxonomy the live catalog uses for the M1 base and
// Memory Optimized Upgrade Premium SKUs (their region list is expressed only as
// the "Americas" grouping, which resolves to the multi-americas identifier).
func multiRegionalSKU(id, displayName string) SKU {
	return SKU{
		SkuId:       id,
		DisplayName: displayName,
		GeoTaxonomy: GeoTaxonomy{Type: "TYPE_MULTI_REGIONAL"},
	}
}

// TestParseMemoryOptimizedPremiumSKU verifies the surcharge SKUs that make up
// M2 pricing are recognized, and that the base/CUD/spot SKUs sharing the
// "Memory-optimized Instance ..." wording are not misclassified as premiums.
func TestParseMemoryOptimizedPremiumSKU(t *testing.T) {
	cases := []struct {
		display      string
		wantResource string
		wantOK       bool
	}{
		{"Memory Optimized Upgrade Premium for Memory-optimized Instance Core running in Americas", "core", true},
		{"Memory Optimized Upgrade Premium for Memory-optimized Instance Ram running in Frankfurt", "ram", true},
		// The M1 base SKUs the premium is layered on top of are not premiums.
		{"Memory-optimized Instance Core running in Americas", "", false},
		{"Memory-optimized Instance Ram running in Tokyo", "", false},
		{"N2 Instance Core running in Iowa", "", false},
	}

	for _, tc := range cases {
		resource, ok := parseMemoryOptimizedPremiumSKU(SKU{DisplayName: tc.display})
		if ok != tc.wantOK || resource != tc.wantResource {
			t.Errorf("parseMemoryOptimizedPremiumSKU(%q) = (%q, %v), want (%q, %v)",
				tc.display, resource, ok, tc.wantResource, tc.wantOK)
		}
	}
}

// TestProcessGCPDataM2Pricing verifies the end-to-end M2 synthesis: m2-* has no
// SKUs of its own, so its on-demand price is the M1 base core/RAM rates plus the
// Memory Optimized Upgrade Premium surcharge. It asserts M2 Spot stays unset
// (no premium Spot SKU exists) and that the premium never leaks into M1's own
// pricing. This fixture has no M1 commitment SKUs, so M2 CUD is also unset here;
// M2 CUD synthesis from M1 commitments is covered by TestProcessGCPDataM2CUDPricing.
func TestProcessGCPDataM2Pricing(t *testing.T) {
	const region = "us-central1" // resolved via the multi-americas expansion

	// Live us-central1/Americas rates (SKUs AE53/9DFC base, 19A3/646C premium).
	baseCore := 0.0348
	baseRam := 0.0051
	premCore := 0.004524
	premRam := 0.000663

	skus := []SKU{
		multiRegionalSKU("m1-core", "Memory-optimized Instance Core running in Americas"),
		multiRegionalSKU("m1-ram", "Memory-optimized Instance Ram running in Americas"),
		// M1 spot rates exist; M2 must NOT inherit them.
		multiRegionalSKU("m1-spot-core", "Spot Preemptible Memory-optimized Instance Core running in Americas"),
		multiRegionalSKU("m1-spot-ram", "Spot Preemptible Memory-optimized Instance Ram running in Americas"),
		multiRegionalSKU("prem-core", "Memory Optimized Upgrade Premium for Memory-optimized Instance Core running in Americas"),
		multiRegionalSKU("prem-ram", "Memory Optimized Upgrade Premium for Memory-optimized Instance Ram running in Americas"),
	}

	pricing := map[string]PriceInfo{
		"m1-core":      usdRate("h", baseCore),
		"m1-ram":       usdRate("giby.h", baseRam),
		"m1-spot-core": usdRate("h", 0.0104),
		"m1-spot-ram":  usdRate("giby.h", 0.0015),
		"prem-core":    usdRate("h", premCore),
		"prem-ram":     usdRate("giby.h", premRam),
	}

	const m1VCPU, m1MemGB = 40, 961.0
	const m2VCPU, m2MemGB = 208, 5888.0
	machineSpecs := map[string]*MachineSpecs{
		"m1-ultramem-40":  {VCPU: m1VCPU, MemoryGB: m1MemGB, Family: "Memory optimized"},
		"m2-ultramem-208": {VCPU: m2VCPU, MemoryGB: m2MemGB, Family: "Memory optimized"},
	}

	regions := map[string]string{region: "Iowa"}

	instances := processGCPData(skus, pricing, machineSpecs, regions)

	m2, ok := instances["m2-ultramem-208"]
	if !ok {
		t.Fatalf("expected m2-ultramem-208 instance to be built")
	}
	m2Linux := linuxPricing(t, m2, region)

	wantM2OnDemand := m2VCPU*(baseCore+premCore) + m2MemGB*(baseRam+premRam)
	assertPrice(t, "m2 ondemand", m2Linux.OnDemand, wantM2OnDemand)

	// M2 Spot stays unset (no premium Spot SKU). M2 CUD is unset here because
	// this fixture supplies no M1 commitment SKUs to synthesize it from.
	if m2Linux.Spot != "" {
		t.Errorf("m2 spot = %q, want empty", m2Linux.Spot)
	}
	if m2Linux.CUD1Yr != "" || m2Linux.CUD3Yr != "" {
		t.Errorf("m2 CUD = (%q, %q), want empty", m2Linux.CUD1Yr, m2Linux.CUD3Yr)
	}

	// M1's own on-demand price must be the base rates only; the premium must
	// not have inflated it.
	m1, ok := instances["m1-ultramem-40"]
	if !ok {
		t.Fatalf("expected m1-ultramem-40 instance to be built")
	}
	m1Linux := linuxPricing(t, m1, region)
	assertPrice(t, "m1 ondemand", m1Linux.OnDemand, m1VCPU*baseCore+m1MemGB*baseRam)
}
