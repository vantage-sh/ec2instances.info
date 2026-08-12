package gcp

import (
	"bytes"
	"encoding/json"
	"log"
	"os"
	"strings"
	"testing"
)

// TestBundledLocalSSDCapacityGB verifies capacity discovery from the Compute
// Engine machineTypes API payload: capacity is partitionCount x per-partition
// size, which is 375 GB except for the Titanium SSD shapes (Z3 at 3,000 GiB,
// bare-metal Z3 at 6,000 GiB, bare-metal C4 at 3,000 GiB, and A4X at 3,000
// GiB). Every expectation below equals the capacity Google documents for that
// shape. Shapes without bundled Local SSD must report 0 so attachable-SSD
// families keep local_ssd=false.
func TestBundledLocalSSDCapacityGB(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want int
	}{
		{
			name: "c3 lssd shape with bundledLocalSsds",
			raw:  `{"name":"c3-standard-8-lssd","guestCpus":8,"memoryMb":32768,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":2}}`,
			want: 750,
		},
		{
			name: "single partition c4a lssd shape",
			raw:  `{"name":"c4a-standard-4-lssd","guestCpus":4,"memoryMb":16384,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":1}}`,
			want: 375,
		},
		{
			name: "z3 titanium ssd disks are 3000 GiB each",
			raw:  `{"name":"z3-highmem-88-highlssd","guestCpus":88,"memoryMb":720896,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":12}}`,
			want: 36000,
		},
		{
			name: "z3 bare-metal titanium ssd disks are 6000 GiB each",
			raw:  `{"name":"z3-highmem-192-highlssd-metal","guestCpus":192,"memoryMb":1572864,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":12}}`,
			want: 72000,
		},
		{
			name: "non-metal c4 lssd shape keeps 375 GB partitions",
			raw:  `{"name":"c4-standard-8-lssd","guestCpus":8,"memoryMb":30720,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":1}}`,
			want: 375,
		},
		{
			name: "c4 bare-metal titanium ssd disks are 3000 GiB each",
			raw:  `{"name":"c4-standard-288-lssd-metal","guestCpus":288,"memoryMb":1105920,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":6}}`,
			want: 18000,
		},
		{
			name: "a4x titanium ssd disks are 3000 GiB each (12,000 GiB total)",
			raw:  `{"name":"a4x-highgpu-4g","guestCpus":140,"memoryMb":905216,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":4}}`,
			want: 12000,
		},
		{
			name: "a4x max bare-metal titanium ssd disks are 3000 GiB each",
			raw:  `{"name":"a4x-maxgpu-4g-metal","guestCpus":144,"memoryMb":983040,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":4}}`,
			want: 12000,
		},
		{
			name: "attachable-only family has no bundled capacity",
			raw:  `{"name":"n2-standard-8","description":"8 vCPUs 32 GB RAM","guestCpus":8,"memoryMb":32768}`,
			want: 0,
		},
		{
			name: "zero partition count is treated as no bundled SSD",
			raw:  `{"name":"c3-standard-8","guestCpus":8,"memoryMb":32768,"bundledLocalSsds":{"defaultInterface":"NVME","partitionCount":0}}`,
			want: 0,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var mt MachineType
			if err := json.Unmarshal([]byte(tc.raw), &mt); err != nil {
				t.Fatalf("unmarshal machine type: %v", err)
			}
			if got := bundledLocalSSDCapacityGB(mt); got != tc.want {
				t.Errorf("bundledLocalSSDCapacityGB(%s) = %d, want %d", mt.Name, got, tc.want)
			}
		})
	}
}

// TestParseLocalSSDSKU covers the two Local SSD usage SKU display-name forms
// (per-family and generic) with their spot variants, and asserts that
// commitment, suspended-VM state, and reservation-scheduling SKUs never feed
// baseline pricing.
func TestParseLocalSSDSKU(t *testing.T) {
	cases := []struct {
		display    string
		wantFamily string
		wantSpot   bool
		wantOK     bool
	}{
		{"C4D Instance Local SSD running in Frankfurt", "C4D", false, true},
		{"Spot Preemptible C4D Instance Local SSD running in Frankfurt", "C4D", true, true},
		{"C3 Instance Local SSD running in Iowa", "C3", false, true},
		{"Z3 Instance Local SSD running in Netherlands", "Z3", false, true},
		{"SSD backed Local Storage running in Paris", "", false, true},
		{"SSD backed Local Storage attached to Spot Preemptible VMs running in Paris", "", true, true},
		{"SSD backed Local Storage in Bangkok", "", false, true},
		// Commitment SKUs must be excluded from baseline pricing.
		{"Commitment v1: Local SSD in Americas for 1 Year", "", false, false},
		{"Commitment v1: C4D Local SSD in Americas for 3 Year", "", false, false},
		// Suspended-VM state storage is not instance pricing.
		{"VM state: preserved local SSD in Bangkok", "", false, false},
		// Reservation-scheduling (DWS) SKUs bill separately.
		{"C3 Instance Local SSD attached to Calendar mode reservations running in Iowa", "", false, false},
		// Core/RAM and unrelated storage SKUs must not match.
		{"N2 Instance Core running in Americas", "", false, false},
		{"Storage PD Capacity in Paris", "", false, false},
	}

	for _, tc := range cases {
		family, isSpot, ok := parseLocalSSDSKU(SKU{DisplayName: tc.display})
		if ok != tc.wantOK {
			t.Errorf("%q: ok=%v want %v", tc.display, ok, tc.wantOK)
			continue
		}
		if !tc.wantOK {
			continue
		}
		if family != tc.wantFamily || isSpot != tc.wantSpot {
			t.Errorf("%q: got (family=%s, spot=%v) want (family=%s, spot=%v)",
				tc.display, family, isSpot, tc.wantFamily, tc.wantSpot)
		}
	}
}

// TestProcessGCPDataLocalSSDPricing verifies the end-to-end assembly for a
// bundled Local SSD shape against its base twin: the -lssd shape's on-demand
// and spot prices carry the bundled capacity at the per GiB-hour SSD rate
// (per-family SKU preferred, generic SKU as fallback), its LocalSSD fields
// are populated, and the base shape's price and fields are untouched.
func TestProcessGCPDataLocalSSDPricing(t *testing.T) {
	const region = "us-central1"

	odCore := 0.03398
	odRam := 0.00456
	spotCore := 0.00885
	spotRam := 0.00119

	// Local SSD catalog rates are per GiB-month. The per-family on-demand rate
	// intentionally differs from the generic one to prove precedence; spot has
	// no per-family SKU so it must fall back to the generic spot rate.
	ssdFamilyMonthly := 0.08
	ssdGenericMonthly := 0.10
	ssdSpotMonthly := 0.032

	skus := []SKU{
		onDemandSKU("od-core", "C3 Instance Core running in Iowa", []string{region}),
		onDemandSKU("od-ram", "C3 Instance Ram running in Iowa", []string{region}),
		onDemandSKU("spot-core", "Spot Preemptible C3 Instance Core running in Iowa", []string{region}),
		onDemandSKU("spot-ram", "Spot Preemptible C3 Instance Ram running in Iowa", []string{region}),
		onDemandSKU("ssd-family", "C3 Instance Local SSD running in Iowa", []string{region}),
		onDemandSKU("ssd-generic", "SSD backed Local Storage running in Iowa", []string{region}),
		onDemandSKU("ssd-spot", "SSD backed Local Storage attached to Spot Preemptible VMs running in Iowa", []string{region}),
	}

	pricing := map[string]PriceInfo{
		"od-core":     usdRate("h", odCore),
		"od-ram":      usdRate("giby.h", odRam),
		"spot-core":   usdRate("h", spotCore),
		"spot-ram":    usdRate("giby.h", spotRam),
		"ssd-family":  usdRate("giby.mo", ssdFamilyMonthly),
		"ssd-generic": usdRate("giby.mo", ssdGenericMonthly),
		"ssd-spot":    usdRate("giby.mo", ssdSpotMonthly),
	}

	const vcpu = 8
	const memGB = 32.0
	const ssdGB = 750
	machineSpecs := map[string]*MachineSpecs{
		"c3-standard-8": {
			VCPU:     vcpu,
			MemoryGB: memGB,
			Family:   "Compute optimized",
		},
		"c3-standard-8-lssd": {
			VCPU:       vcpu,
			MemoryGB:   memGB,
			Family:     "Compute optimized",
			LocalSSDGB: ssdGB,
		},
	}

	regions := map[string]string{region: "Iowa"}

	instances := processGCPData(skus, pricing, machineSpecs, regions)

	base, ok := instances["c3-standard-8"]
	if !ok {
		t.Fatalf("expected c3-standard-8 instance to be built")
	}
	lssd, ok := instances["c3-standard-8-lssd"]
	if !ok {
		t.Fatalf("expected c3-standard-8-lssd instance to be built")
	}

	// Capacity fields: set on the bundled shape, untouched on the base twin.
	if base.LocalSSD || base.LocalSSDSize != 0 {
		t.Errorf("base shape: LocalSSD=%v LocalSSDSize=%d, want false/0", base.LocalSSD, base.LocalSSDSize)
	}
	if !lssd.LocalSSD || lssd.LocalSSDSize != ssdGB {
		t.Errorf("lssd shape: LocalSSD=%v LocalSSDSize=%d, want true/%d", lssd.LocalSSD, lssd.LocalSSDSize, ssdGB)
	}

	baseLinux := linuxPricing(t, base, region)
	lssdLinux := linuxPricing(t, lssd, region)

	wantBaseOnDemand := float64(vcpu)*odCore + memGB*odRam
	wantBaseSpot := float64(vcpu)*spotCore + memGB*spotRam

	// GiB-month -> GiB-hour uses the 730 hours/month convention shared by
	// calculateHourlyPrice.
	wantLssdOnDemand := wantBaseOnDemand + ssdGB*(ssdFamilyMonthly/730)
	wantLssdSpot := wantBaseSpot + ssdGB*(ssdSpotMonthly/730)

	assertPrice(t, "base ondemand", baseLinux.OnDemand, wantBaseOnDemand)
	assertPrice(t, "base spot", baseLinux.Spot, wantBaseSpot)
	assertPrice(t, "lssd ondemand", lssdLinux.OnDemand, wantLssdOnDemand)
	assertPrice(t, "lssd spot", lssdLinux.Spot, wantLssdSpot)
}

// TestProcessGCPDataLocalSSDLegacyRegions mirrors the live catalog metadata
// for the five legacy regions (asia-east1, europe-west1, us-central1,
// us-east1, us-west1): the generic Local SSD SKUs there have no region tail
// in the display name and scope regions only via multiRegionalMetadata, and
// Google categorizes even the Spot-attached variant's taxonomy as
// "On Demand" — the two properties the SSD path must handle explicitly.
func TestProcessGCPDataLocalSSDLegacyRegions(t *testing.T) {
	const region = "us-central1"

	odCore := 0.03398
	odRam := 0.00456
	spotCore := 0.00885
	spotRam := 0.00119
	ssdGenericMonthly := 0.08
	ssdSpotMonthly := 0.0389

	legacyGeo := GeoTaxonomy{
		Type: "TYPE_MULTI_REGIONAL",
		MultiRegionalMetadata: &MultiRegionalMetadata{
			Regions: []RegionInfo{
				{Region: "asia-east1"}, {Region: "europe-west1"},
				{Region: "us-central1"}, {Region: "us-east1"}, {Region: "us-west1"},
			},
		},
	}
	onDemandTaxonomy := ProductTaxonomy{TaxonomyCategories: []CategoryItem{
		{Category: "GCP"}, {Category: "Compute"}, {Category: "Local SSD"}, {Category: "On Demand"},
	}}

	skus := []SKU{
		onDemandSKU("od-core", "C3 Instance Core running in Iowa", []string{region}),
		onDemandSKU("od-ram", "C3 Instance Ram running in Iowa", []string{region}),
		onDemandSKU("spot-core", "Spot Preemptible C3 Instance Core running in Iowa", []string{region}),
		onDemandSKU("spot-ram", "Spot Preemptible C3 Instance Ram running in Iowa", []string{region}),
		{SkuId: "ssd-generic", DisplayName: "SSD backed Local Storage", GeoTaxonomy: legacyGeo, ProductTaxonomy: onDemandTaxonomy},
		{SkuId: "ssd-spot", DisplayName: "SSD backed Local Storage attached to Spot Preemptible VMs", GeoTaxonomy: legacyGeo, ProductTaxonomy: onDemandTaxonomy},
	}

	pricing := map[string]PriceInfo{
		"od-core":     usdRate("h", odCore),
		"od-ram":      usdRate("giby.h", odRam),
		"spot-core":   usdRate("h", spotCore),
		"spot-ram":    usdRate("giby.h", spotRam),
		"ssd-generic": usdRate("giby.mo", ssdGenericMonthly),
		"ssd-spot":    usdRate("giby.mo", ssdSpotMonthly),
	}

	const vcpu = 8
	const memGB = 32.0
	const ssdGB = 750
	machineSpecs := map[string]*MachineSpecs{
		"c3-standard-8-lssd": {
			VCPU:       vcpu,
			MemoryGB:   memGB,
			Family:     "Compute optimized",
			LocalSSDGB: ssdGB,
		},
	}

	instances := processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Iowa"})

	lssd, ok := instances["c3-standard-8-lssd"]
	if !ok {
		t.Fatalf("expected c3-standard-8-lssd instance to be built")
	}
	lssdLinux := linuxPricing(t, lssd, region)

	wantOnDemand := float64(vcpu)*odCore + memGB*odRam + ssdGB*(ssdGenericMonthly/730)
	wantSpot := float64(vcpu)*spotCore + memGB*spotRam + ssdGB*(ssdSpotMonthly/730)

	assertPrice(t, "lssd ondemand (legacy multi-regional SKU)", lssdLinux.OnDemand, wantOnDemand)
	assertPrice(t, "lssd spot (On Demand taxonomy)", lssdLinux.Spot, wantSpot)
}

// captureWarnings collects what utils.SendWarning logs while fn runs. It logs
// through the standard logger, so redirecting that is enough to assert on a
// warning without a test-only hook in the scraper itself.
func captureWarnings(t *testing.T, fn func()) string {
	t.Helper()
	var buf bytes.Buffer
	log.SetOutput(&buf)
	t.Cleanup(func() { log.SetOutput(os.Stderr) })
	fn()
	return buf.String()
}

// TestMissingLocalSSDRateIsReported pins the reason the SSD fold-in reports
// misses at all: a bundled Local SSD shape in a region with no Local SSD rate
// is priced core+RAM only, which is indistinguishable from the SSD-less bug
// this scraper had. Silence there would ship a too-low price unnoticed.
func TestMissingLocalSSDRateIsReported(t *testing.T) {
	const region = "us-central1"

	skus := []SKU{
		onDemandSKU("od-core", "C3 Instance Core running in Iowa", []string{region}),
		onDemandSKU("od-ram", "C3 Instance Ram running in Iowa", []string{region}),
	}
	pricing := map[string]PriceInfo{
		"od-core": usdRate("h", 0.03398),
		"od-ram":  usdRate("giby.h", 0.00456),
	}
	machineSpecs := map[string]*MachineSpecs{
		"c3-standard-8-lssd": {VCPU: 8, MemoryGB: 32, Family: "Compute optimized", LocalSSDGB: 750},
	}

	var instances map[string]*GCPInstance
	warnings := captureWarnings(t, func() {
		instances = processGCPData(skus, pricing, machineSpecs, map[string]string{region: "Iowa"})
	})

	if !strings.Contains(warnings, "C3/us-central1/spot=false") {
		t.Errorf("expected a missing Local SSD rate warning naming C3/us-central1, got:\n%s", warnings)
	}

	// The shape still ships at its core+RAM price; the warning is the only
	// signal that the price is incomplete.
	lssd := linuxPricing(t, mustInstance(t, instances, "c3-standard-8-lssd"), region)
	assertPrice(t, "lssd ondemand without an SSD rate", lssd.OnDemand, 8*0.03398+32*0.00456)
}

// TestUnknownLocalSSDPartitionSizeIsReported covers the other silent-mispricing
// path: partition size is a per-series constant the API never returns, so a
// series (or bare-metal variant) that deviates from 375 GB must not be assumed
// away. Bare metal is checked separately because Z3 and C4 metal shapes use
// larger disks than the rest of their own series.
func TestUnknownLocalSSDPartitionSizeIsReported(t *testing.T) {
	cases := []struct {
		name     string
		wantWarn bool
	}{
		{"c3-standard-8-lssd", false},
		{"c4-standard-288-lssd-metal", false},
		{"z3-highmem-192-highlssd-metal", false},
		{"a4x-maxgpu-4g-metal", false},
		{"w9-standard-8-lssd", true},
		{"c4d-standard-384-lssd-metal", true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			mt := MachineType{Name: tc.name, BundledLocalSsds: &BundledLocalSsds{PartitionCount: 2}}
			warnings := captureWarnings(t, func() { bundledLocalSSDCapacityGB(mt) })
			if got := strings.Contains(warnings, tc.name); got != tc.wantWarn {
				t.Errorf("warned=%v want %v for %s (output: %s)", got, tc.wantWarn, tc.name, warnings)
			}
		})
	}
}

// TestGenericLocalSSDFallbackIsReported covers the live c4/asia-southeast3
// gap: Google offers c4-*-lssd shapes in Bangkok and sells C4 core and RAM
// there, but publishes no "C4 Instance Local SSD running in Bangkok" SKU, so
// the shape resolves to the legacy generic rate. Per-family Titanium SSD rates
// run about twice the generic rate, so the shape ships understated by roughly
// half its SSD component with no other symptom: the rate is present and is
// identical across every C4 shape in the region, so neither the missing-rate
// warning nor an implied-rate consistency check can see it.
//
// C3 is the control. It has no per-family Local SSD SKU in any region, so the
// generic rate is the correct rate for it and must not warn.
func TestGenericLocalSSDFallbackIsReported(t *testing.T) {
	const iowa, bangkok = "us-central1", "asia-southeast3"
	both := []string{iowa, bangkok}

	skus := []SKU{
		onDemandSKU("c4-core", "C4 Instance Core running in Iowa", both),
		onDemandSKU("c4-ram", "C4 Instance Ram running in Iowa", both),
		onDemandSKU("c3-core", "C3 Instance Core running in Iowa", both),
		onDemandSKU("c3-ram", "C3 Instance Ram running in Iowa", both),
		onDemandSKU("c4-ssd-iowa", "C4 Instance Local SSD running in Iowa", []string{iowa}),
		onDemandSKU("generic-ssd", "SSD backed Local Storage", both),
	}
	pricing := map[string]PriceInfo{
		"c4-core":     usdRate("h", 0.03638),
		"c4-ram":      usdRate("giby.h", 0.004135),
		"c3-core":     usdRate("h", 0.03398),
		"c3-ram":      usdRate("giby.h", 0.00456),
		"c4-ssd-iowa": usdRate("giby.mo", 0.16),
		"generic-ssd": usdRate("giby.mo", 0.084),
	}
	machineSpecs := map[string]*MachineSpecs{
		"c4-standard-8-lssd": {VCPU: 8, MemoryGB: 30, Family: "Compute optimized", LocalSSDGB: 375},
		"c3-standard-8-lssd": {VCPU: 8, MemoryGB: 32, Family: "Compute optimized", LocalSSDGB: 750},
	}

	var instances map[string]*GCPInstance
	warnings := captureWarnings(t, func() {
		instances = processGCPData(skus, pricing, machineSpecs,
			map[string]string{iowa: "Iowa", bangkok: "Bangkok"})
	})

	if !strings.Contains(warnings, "C4/asia-southeast3") {
		t.Errorf("expected a generic Local SSD fallback warning naming C4/asia-southeast3, got:\n%s", warnings)
	}
	if strings.Contains(warnings, "C4/us-central1") {
		t.Errorf("C4 has its own Iowa Local SSD SKU and must not warn there, got:\n%s", warnings)
	}
	for _, region := range both {
		if strings.Contains(warnings, "C3/"+region) {
			t.Errorf("C3 has no per-family Local SSD SKU anywhere, so the generic rate is correct; got:\n%s", warnings)
		}
	}

	// The warned shape still ships, priced from the generic rate.
	c4 := mustInstance(t, instances, "c4-standard-8-lssd")
	assertPrice(t, "c4 lssd Bangkok on the generic SSD rate",
		linuxPricing(t, c4, bangkok).OnDemand, 8*0.03638+30*0.004135+375*0.084/730)
	assertPrice(t, "c4 lssd Iowa on its own C4 SSD rate",
		linuxPricing(t, c4, iowa).OnDemand, 8*0.03638+30*0.004135+375*0.16/730)
}

// TestZ3BundledLocalSSDUsesGenericRate pins the one family whose bundled Local
// SSD is billed at the generic rate despite having per-family Local SSD SKUs.
// Google's published Z3 prices reconstruct from the generic rate and never from
// the per-family one; see bundledSSDBillsAtGenericRate.
//
// The rates below are deliberately far apart so the assertions fail if the
// precedence reverts. That matters more than usual here: bundledSSDBillsAtGenericRate
// is keyed on the uppercased machine family, so a lowercase key would leave the
// old behaviour in place with nothing else to notice it.
func TestZ3BundledLocalSSDUsesGenericRate(t *testing.T) {
	const iowa, berlin = "us-central1", "europe-west10"
	both := []string{iowa, berlin}
	const z3SSDMonthly, genericSSDMonthly = 0.16, 0.08

	skus := []SKU{
		onDemandSKU("z3-core", "Z3 Instance Core running in Iowa", both),
		onDemandSKU("z3-ram", "Z3 Instance Ram running in Iowa", both),
		onDemandSKU("c4-core", "C4 Instance Core running in Iowa", both),
		onDemandSKU("c4-ram", "C4 Instance Ram running in Iowa", both),
		onDemandSKU("z3-ssd", "Z3 Instance Local SSD running in Iowa", both),
		onDemandSKU("c4-ssd", "C4 Instance Local SSD running in Iowa", both),
		// Generic rate exists in Iowa only, so Berlin exercises the fallback to
		// the per-family bucket that reversing the precedence has to preserve.
		onDemandSKU("generic-ssd", "SSD backed Local Storage in Iowa", []string{iowa}),
	}
	pricing := map[string]PriceInfo{
		"z3-core": usdRate("h", 0.0459), "z3-ram": usdRate("giby.h", 0.00614),
		"c4-core": usdRate("h", 0.03638), "c4-ram": usdRate("giby.h", 0.004135),
		"z3-ssd": usdRate("giby.mo", z3SSDMonthly), "c4-ssd": usdRate("giby.mo", 0.16),
		"generic-ssd": usdRate("giby.mo", genericSSDMonthly),
	}
	machineSpecs := map[string]*MachineSpecs{
		"z3-highmem-22-highlssd": {VCPU: 22, MemoryGB: 176, Family: "Storage optimized", LocalSSDGB: 9000},
		"c4-standard-8-lssd":     {VCPU: 8, MemoryGB: 30, Family: "Compute optimized", LocalSSDGB: 375},
	}

	var instances map[string]*GCPInstance
	warnings := captureWarnings(t, func() {
		instances = processGCPData(skus, pricing, machineSpecs,
			map[string]string{iowa: "Iowa", berlin: "Berlin"})
	})

	z3 := mustInstance(t, instances, "z3-highmem-22-highlssd")
	z3Core, z3Mem := 22*0.0459+176*0.00614, 9000.0
	assertPrice(t, "z3 uses the generic SSD rate where one exists",
		linuxPricing(t, z3, iowa).OnDemand, z3Core+z3Mem*genericSSDMonthly/730)
	assertPrice(t, "z3 falls back to its per-family rate where no generic rate exists",
		linuxPricing(t, z3, berlin).OnDemand, z3Core+z3Mem*z3SSDMonthly/730)

	// C4 must be untouched: the reversal is per-family, not global.
	assertPrice(t, "c4 still uses its per-family SSD rate",
		linuxPricing(t, mustInstance(t, instances, "c4-standard-8-lssd"), iowa).OnDemand,
		8*0.03638+30*0.004135+375*0.16/730)

	// Z3 resolving through the generic bucket is intended, so it must not be
	// reported as a fallback. Berlin losing its generic rate is the new failure
	// mode the reversal introduces, and that one must be reported.
	if strings.Contains(warnings, "Z3/us-central1") {
		t.Errorf("Z3 on the generic rate is intended and must not warn, got:\n%s", warnings)
	}
	if !strings.Contains(warnings, "Z3/europe-west10") {
		t.Errorf("expected a warning that Z3 had no generic rate in europe-west10, got:\n%s", warnings)
	}
}

func linuxPricing(t *testing.T, instance *GCPInstance, region string) *GCPPricingData {
	t.Helper()
	regionPricing, ok := instance.Pricing[region]
	if !ok {
		t.Fatalf("%s: expected pricing for region %s", instance.InstanceType, region)
	}
	linux, ok := regionPricing["linux"].(*GCPPricingData)
	if !ok {
		t.Fatalf("%s: expected linux pricing data", instance.InstanceType)
	}
	return linux
}
