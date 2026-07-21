package gcp

import (
	"encoding/json"
	"testing"
)

// TestBundledLocalSSDCapacityGB verifies capacity discovery from the Compute
// Engine machineTypes API payload: the structured bundledLocalSsds field is
// the primary source (partitionCount x per-partition size, 375 GB for every
// series except Z3's 3,000 GiB Titanium SSD disks, or 6,000 GiB for the
// bare-metal Z3 shapes), with the disk count in the human-readable
// description as a fallback. Shapes without bundled Local SSD must report 0
// so attachable-SSD families keep local_ssd=false.
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
