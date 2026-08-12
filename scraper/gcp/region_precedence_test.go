package gcp

import (
	"strings"
	"testing"
)

// TestRegionScopedSKUBeatsMultiRegional pins the precedence in selectHourlyPrice:
// a SKU scoped to the region wins over a rate inherited from a multi-regional
// SKU expanded into that region, regardless of which is cheaper.
//
// The live case that motivated it is Z3 Spot in us-east5, where "Spot Preemptible
// Z3 Instance Core running in Columbus" ($0.02518) and "... running in Americas"
// ($0.01935) both resolve to the region. Spot used to select the minimum across
// both tiers, so the Americas rate won and every Americas region collapsed to one
// number, 27% under Google's published price. On-demand had the mirror-image
// exposure via max, so both directions are asserted here: a rate that loses on
// price must still win on scope.
func TestRegionScopedSKUBeatsMultiRegional(t *testing.T) {
	// us-east5 is a member of multi-americas; us-west2 is a member with no
	// region-scoped SKU in this fixture, so it must inherit the Americas rate.
	const columbus, losAngeles = "us-east5", "us-west2"

	const (
		columbusCore, columbusRam = 0.02518, 0.003375
		americasCore, americasRam = 0.01935, 0.002594 // cheaper: loses on scope
		columbusODCore            = 0.0900            // cheaper than Americas on demand
		americasODCore            = 0.1100            // dearer: must still lose on scope
		ramOD                     = 0.001
	)

	skus := []SKU{
		onDemandSKU("z3-spot-core-col", "Spot Preemptible Z3 Instance Core running in Columbus", []string{columbus}),
		onDemandSKU("z3-spot-ram-col", "Spot Preemptible Z3 Instance Ram running in Columbus", []string{columbus}),
		multiRegionalSKU("z3-spot-core-ame", "Spot Preemptible Z3 Instance Core running in Americas"),
		multiRegionalSKU("z3-spot-ram-ame", "Spot Preemptible Z3 Instance Ram running in Americas"),
		onDemandSKU("z3-od-core-col", "Z3 Instance Core running in Columbus", []string{columbus}),
		multiRegionalSKU("z3-od-core-ame", "Z3 Instance Core running in Americas"),
		multiRegionalSKU("z3-od-ram-ame", "Z3 Instance Ram running in Americas"),
	}
	pricing := map[string]PriceInfo{
		"z3-spot-core-col": usdRate("h", columbusCore),
		"z3-spot-ram-col":  usdRate("giby.h", columbusRam),
		"z3-spot-core-ame": usdRate("h", americasCore),
		"z3-spot-ram-ame":  usdRate("giby.h", americasRam),
		"z3-od-core-col":   usdRate("h", columbusODCore),
		"z3-od-core-ame":   usdRate("h", americasODCore),
		"z3-od-ram-ame":    usdRate("giby.h", ramOD),
	}

	const vcpu, memGB = 22, 176.0
	machineSpecs := map[string]*MachineSpecs{
		"z3-highmem-22": {VCPU: vcpu, MemoryGB: memGB, Family: "Storage optimized"},
	}
	regions := map[string]string{columbus: "Columbus", losAngeles: "Los Angeles"}

	instances := processGCPData(skus, pricing, machineSpecs, regions)
	shape := mustInstance(t, instances, "z3-highmem-22")

	col := linuxPricing(t, shape, columbus)
	assertPrice(t, "spot takes the region-scoped rate even though Americas is cheaper",
		col.Spot, vcpu*columbusCore+memGB*columbusRam)
	// RAM has no region-scoped on-demand SKU here, so on-demand mixes a scoped
	// core with an inherited RAM rate -- the precedence is per bucket, not per shape.
	assertPrice(t, "on-demand takes the region-scoped core even though Americas is dearer",
		col.OnDemand, vcpu*columbusODCore+memGB*ramOD)

	// A member region with no scoped SKU must still inherit, or the fix would
	// trade a wrong price for a missing one.
	la := linuxPricing(t, shape, losAngeles)
	assertPrice(t, "region with no scoped SKU inherits the Americas spot rate",
		la.Spot, vcpu*americasCore+memGB*americasRam)
	assertPrice(t, "region with no scoped SKU inherits the Americas on-demand rate",
		la.OnDemand, vcpu*americasODCore+memGB*ramOD)
}

// TestDuplicateRegionScopedSKUPrefersHigherRate pins the rule inside the winning
// tier: when two SKUs Google scopes to the same region disagree on price, the
// higher rate is the one it bills.
//
// Rates are the live us-east4 M1 memory-optimized pair, where the catalog carries
// both "Memory-optimized Instance Core running in Virginia" and "... running in
// Northern Virginia" at different prices with the same geoTaxonomy region. Taking
// the minimum on Spot put m1-ultramem-40 at 1.159750 against Google's published
// 1.495132, 22.4% low. Both columns are asserted because the choice is not
// symmetric by luck: H4D's duplicate is a Dynamic Workload Scheduler product at
// 1.25x the standard rate, and it is only the max direction that leaves H4D
// on-demand correct.
func TestDuplicateRegionScopedSKUPrefersHigherRate(t *testing.T) {
	const virginia = "us-east4"

	// Live us-east4 M1 rates; the "Virginia" spelling carries the higher rate on
	// both columns and is the one Google bills.
	const (
		spotCoreHigh, spotCoreLow = 0.00826, 0.00617
		spotRAMHigh, spotRAMLow   = 0.001212, 0.00095
		odCoreHigh, odCoreLow     = 0.0392322, 0.0392
		odRAMHigh, odRAMLow       = 0.0053, 0.0052
	)

	skus := []SKU{
		onDemandSKU("m1-spot-core-va", "Spot Preemptible Memory-optimized Instance Core running in Virginia", []string{virginia}),
		onDemandSKU("m1-spot-core-nova", "Spot Preemptible Memory-optimized Instance Core running in Northern Virginia", []string{virginia}),
		onDemandSKU("m1-spot-ram-va", "Spot Preemptible Memory-optimized Instance Ram running in Virginia", []string{virginia}),
		onDemandSKU("m1-spot-ram-nova", "Spot Preemptible Memory-optimized Instance Ram running in Northern Virginia", []string{virginia}),
		onDemandSKU("m1-od-core-va", "Memory-optimized Instance Core running in Virginia", []string{virginia}),
		onDemandSKU("m1-od-core-nova", "Memory-optimized Instance Core running in Northern Virginia", []string{virginia}),
		onDemandSKU("m1-od-ram-va", "Memory-optimized Instance Ram running in Virginia", []string{virginia}),
		onDemandSKU("m1-od-ram-nova", "Memory-optimized Instance Ram running in Northern Virginia", []string{virginia}),
	}
	pricing := map[string]PriceInfo{
		"m1-spot-core-va":   usdRate("h", spotCoreHigh),
		"m1-spot-core-nova": usdRate("h", spotCoreLow),
		"m1-spot-ram-va":    usdRate("giby.h", spotRAMHigh),
		"m1-spot-ram-nova":  usdRate("giby.h", spotRAMLow),
		"m1-od-core-va":     usdRate("h", odCoreHigh),
		"m1-od-core-nova":   usdRate("h", odCoreLow),
		"m1-od-ram-va":      usdRate("giby.h", odRAMHigh),
		"m1-od-ram-nova":    usdRate("giby.h", odRAMLow),
	}

	const vcpu, memGB = 40, 961.0
	machineSpecs := map[string]*MachineSpecs{
		"m1-ultramem-40": {VCPU: vcpu, MemoryGB: memGB, Family: "Memory optimized"},
	}

	instances := processGCPData(skus, pricing, machineSpecs, map[string]string{virginia: "Virginia"})
	prices := linuxPricing(t, mustInstance(t, instances, "m1-ultramem-40"), virginia)

	// Expected values are built from the same constants rather than written as
	// literals: usdRate converts through float64 nanos and does not round-trip
	// a hand-typed decimal exactly.
	assertPrice(t, "spot takes the higher of two region-scoped rates",
		prices.Spot, vcpu*spotCoreHigh+memGB*spotRAMHigh)
	assertPrice(t, "on-demand takes the higher of two region-scoped rates",
		prices.OnDemand, vcpu*odCoreHigh+memGB*odRAMHigh)
}

// TestMultiRegionalOnlyCandidatesTakeHigherRate covers the fallback tier on its
// own. Every other test in this file has at least one region-scoped candidate, so
// without this the multi-regional-only path is never exercised with more than one
// rate and the selection rule there is untested.
func TestMultiRegionalOnlyCandidatesTakeHigherRate(t *testing.T) {
	const region = "us-west2"
	const coreHigh, coreLow, ram = 0.0400, 0.0300, 0.001

	skus := []SKU{
		multiRegionalSKU("z3-core-ame-a", "Z3 Instance Core running in Americas"),
		multiRegionalSKU("z3-core-ame-b", "Z3 Instance Core running in Americas"),
		multiRegionalSKU("z3-ram-ame", "Z3 Instance Ram running in Americas"),
	}
	pricing := map[string]PriceInfo{
		"z3-core-ame-a": usdRate("h", coreHigh),
		"z3-core-ame-b": usdRate("h", coreLow),
		"z3-ram-ame":    usdRate("giby.h", ram),
	}

	const vcpu, memGB = 22, 176.0
	machineSpecs := map[string]*MachineSpecs{
		"z3-highmem-22": {VCPU: vcpu, MemoryGB: memGB, Family: "Storage optimized"},
	}

	instances := processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Los Angeles"})
	prices := linuxPricing(t, mustInstance(t, instances, "z3-highmem-22"), region)

	assertPrice(t, "inherited multi-regional rates also take the higher value",
		prices.OnDemand, vcpu*coreHigh+memGB*ram)
}

// TestDWSSKUsExcludedFromInstancePricing pins the exclusion of
// reservation-scheduling products from baseline pricing.
//
// "DWS Calendar Mode H4D Instance Core" is the one DWS spelling that reaches
// machineTypeRegex -- the other families spell theirs "<FAMILY> Core" with no
// "Instance" -- and it is a separately-priced product, not a cheaper way to buy
// the same VM. The fixture prices the DWS twin ABOVE the standard rate so that a
// missing filter cannot hide behind selectHourlyPrice's max.
func TestDWSSKUsExcludedFromInstancePricing(t *testing.T) {
	const region = "us-central1"
	const stdCore, stdRAM = 0.050505, 0.004
	const dwsCore, dwsRAM = 0.063131, 0.005 // 1.25x, the live DWS ratio

	skus := []SKU{
		onDemandSKU("h4d-core", "H4D Instance Core running in Iowa", []string{region}),
		onDemandSKU("h4d-ram", "H4D Instance Ram running in Iowa", []string{region}),
		onDemandSKU("h4d-dws-core", "DWS Calendar Mode H4D Instance Core running in Iowa", []string{region}),
		onDemandSKU("h4d-dws-ram", "DWS Calendar Mode H4D Instance Ram running in Iowa", []string{region}),
		onDemandSKU("h4d-flex-core", "DWS Flex Start H4D Standard Core running in Iowa", []string{region}),
	}
	pricing := map[string]PriceInfo{
		"h4d-core":      usdRate("h", stdCore),
		"h4d-ram":       usdRate("giby.h", stdRAM),
		"h4d-dws-core":  usdRate("h", dwsCore),
		"h4d-dws-ram":   usdRate("giby.h", dwsRAM),
		"h4d-flex-core": usdRate("h", dwsCore),
	}

	const vcpu, memGB = 192, 720.0
	machineSpecs := map[string]*MachineSpecs{
		"h4d-highmem-192": {VCPU: vcpu, MemoryGB: memGB, Family: "Compute optimized"},
	}

	warnings := captureWarnings(t, func() {
		instances := processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Iowa"})
		prices := linuxPricing(t, mustInstance(t, instances, "h4d-highmem-192"), region)
		assertPrice(t, "DWS rates do not feed baseline on-demand pricing",
			prices.OnDemand, vcpu*stdCore+memGB*stdRAM)
	})

	// Excluded, not merely out-selected: a DWS rate that reached the bucket would
	// make it ambiguous and be reported.
	if strings.Contains(warnings, "H4D/us-central1") {
		t.Errorf("DWS SKUs reached the H4D rate bucket, warning: %s", warnings)
	}
}

// TestAmbiguousRegionScopedRatesAreReported pins the telemetry that makes a
// duplicated catalog entry visible. selectHourlyPrice resolves the disagreement
// by taking the higher rate, which is correct for every live case today, but the
// choice stands in for a product-classification question and must not be silent:
// a future region where Google bills the lower twin would otherwise ship wrong
// with no signal.
func TestAmbiguousRegionScopedRatesAreReported(t *testing.T) {
	const region = "us-east4"
	const coreHigh, coreLow, ram = 0.0392322, 0.0392, 0.0053

	skus := []SKU{
		onDemandSKU("m1-core-va", "Memory-optimized Instance Core running in Virginia", []string{region}),
		onDemandSKU("m1-core-nova", "Memory-optimized Instance Core running in Northern Virginia", []string{region}),
		onDemandSKU("m1-ram-va", "Memory-optimized Instance Ram running in Virginia", []string{region}),
	}
	pricing := map[string]PriceInfo{
		"m1-core-va":   usdRate("h", coreHigh),
		"m1-core-nova": usdRate("h", coreLow),
		"m1-ram-va":    usdRate("giby.h", ram),
	}
	machineSpecs := map[string]*MachineSpecs{
		"m1-ultramem-40": {VCPU: 40, MemoryGB: 961, Family: "Memory optimized"},
	}

	warnings := captureWarnings(t, func() {
		processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Virginia"})
	})

	if !strings.Contains(warnings, "M1/us-east4/core/ondemand") {
		t.Errorf("duplicated core rate bucket not reported, warnings: %s", warnings)
	}
	// The RAM bucket has a single rate and must not be reported, or the warning
	// degenerates into noise on every scrape.
	if strings.Contains(warnings, "M1/us-east4/ram/ondemand") {
		t.Errorf("unambiguous ram bucket was reported, warnings: %s", warnings)
	}
}
