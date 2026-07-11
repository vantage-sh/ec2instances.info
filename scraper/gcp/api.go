package gcp

import (
	"fmt"
	"log"
	"os"
	"regexp"
	"scraper/utils"
	"strconv"
	"strings"
	"sync"
)

const (
	GCP_BILLING_API_BASE = "https://cloudbilling.googleapis.com"
	COMPUTE_SERVICE_ID   = "6F81-5844-456A" // Compute Engine service ID
	GCP_COMPUTE_API_BASE = "https://compute.googleapis.com/compute/v1"
)

// API Response structures
type Service struct {
	Name        string `json:"name"`
	ServiceId   string `json:"serviceId"`
	DisplayName string `json:"displayName"`
}

type ServicesResponse struct {
	Services      []Service `json:"services"`
	NextPageToken string    `json:"nextPageToken"`
}

type SKU struct {
	Name            string          `json:"name"`
	SkuId           string          `json:"skuId"`
	DisplayName     string          `json:"displayName"`
	Service         string          `json:"service"`
	ProductTaxonomy ProductTaxonomy `json:"productTaxonomy"`
	GeoTaxonomy     GeoTaxonomy     `json:"geoTaxonomy"`
}

type ProductTaxonomy struct {
	TaxonomyCategories []CategoryItem `json:"taxonomyCategories"`
}

type CategoryItem struct {
	Category string `json:"category"`
}

type GeoTaxonomy struct {
	Type                  string                 `json:"type"`
	RegionalMetadata      *RegionalMetadata      `json:"regionalMetadata,omitempty"`
	MultiRegionalMetadata *MultiRegionalMetadata `json:"multiRegionalMetadata,omitempty"`
	Regions               []string               `json:"regions,omitempty"`
}

type MultiRegionalMetadata struct {
	Regions []RegionInfo `json:"regions"`
}

type RegionalMetadata struct {
	Region RegionInfo `json:"region"`
}

type RegionInfo struct {
	Region string `json:"region"`
}

type SKUsResponse struct {
	Skus          []SKU  `json:"skus"`
	NextPageToken string `json:"nextPageToken"`
}

type PriceInfo struct {
	Name         string `json:"name"`
	CurrencyCode string `json:"currencyCode"`
	ValueType    string `json:"valueType"`
	Rate         Rate   `json:"rate"`
}

type Rate struct {
	Tiers []Tier   `json:"tiers"`
	Unit  UnitInfo `json:"unitInfo"`
}

type Tier struct {
	StartAmount Money `json:"startAmount"`
	ListPrice   Money `json:"listPrice"`
}

type Money struct {
	Units string `json:"units,omitempty"`
	Nanos int64  `json:"nanos,omitempty"`
}

type UnitInfo struct {
	Unit            string `json:"unit"`
	UnitDescription string `json:"unitDescription"`
	UnitQuantity    Money  `json:"unitQuantity,omitempty"`
}

type PricesResponse struct {
	Prices        []PriceInfo `json:"prices"`
	NextPageToken string      `json:"nextPageToken"`
}

type priceSelectionStats struct {
	totalPriceRecords     int
	skuParsed             int
	selected              int
	rejectedNonUSD        int
	rejectedNonRate       int
	rejectedNoTiers       int
	rejectedUnknownUnit   int
	rejectedNonZeroStart  int
	rejectedInvalidAmount int
	nonDefaultUnitQty     int
	ambiguousCandidates   int
}

// Machine type structures from Compute Engine API
type MachineType struct {
	Name                         string        `json:"name"`
	Description                  string        `json:"description"`
	GuestCpus                    int           `json:"guestCpus"`
	MemoryMb                     int           `json:"memoryMb"`
	IsSharedCpu                  bool          `json:"isSharedCpu"`
	Zone                         string        `json:"zone"`
	MaximumPersistentDisks       int           `json:"maximumPersistentDisks"`
	MaximumPersistentDisksSizeGb string        `json:"maximumPersistentDisksSizeGb"`
	Accelerators                 []Accelerator `json:"accelerators,omitempty"`
	// BundledLocalSsds is only present for machine types that come with Local
	// SSD built in (Z3, the -lssd shapes of C3/C3D/C4/C4A/C4D/H4D, and the
	// accelerator-optimized series). Families where Local SSD is an optional
	// per-VM attachment omit the field entirely.
	BundledLocalSsds *BundledLocalSsds `json:"bundledLocalSsds,omitempty"`
}

type BundledLocalSsds struct {
	DefaultInterface string `json:"defaultInterface"`
	PartitionCount   int    `json:"partitionCount"`
}

type Accelerator struct {
	GuestAcceleratorType  string `json:"guestAcceleratorType"`
	GuestAcceleratorCount int    `json:"guestAcceleratorCount"`
}

type MachineTypesResponse struct {
	Items         []MachineType `json:"items"`
	NextPageToken string        `json:"nextPageToken"`
}

type AggregatedMachineTypesResponse struct {
	Items         map[string]MachineTypesScopedList `json:"items"`
	NextPageToken string                            `json:"nextPageToken"`
}

type MachineTypesScopedList struct {
	MachineTypes []MachineType `json:"machineTypes,omitempty"`
}

// MachineSpecs holds the specifications for a machine type
type MachineSpecs struct {
	VCPU        int
	MemoryGB    float64
	Family      string
	IsSharedCPU bool
	GPU         int
	GPUModel    string
	GPUMemory   int
	Zones       []string
	// LocalSSDGB is the bundled Local SSD capacity in GB, 0 when the machine
	// type has none. Optional (user-attachable) Local SSD is never counted.
	LocalSSDGB int
}

// gpuMemoryByModel maps a GCP guestAcceleratorType (the model string the
// Compute Engine API returns, e.g. "nvidia-h100-80gb") to the per-GPU memory
// in GiB. Values are sourced from the official Google Cloud GPU documentation
// (https://cloud.google.com/compute/docs/gpus and
// https://cloud.google.com/compute/docs/accelerator-optimized-machines).
// Unknown models return 0 so the field is omitted rather than fabricated.
var gpuMemoryByModel = map[string]int{
	"nvidia-h200-141gb":     141, // A3 Ultra
	"nvidia-h100-80gb":      80,  // A3 High/Edge
	"nvidia-h100-mega-80gb": 80,  // A3 Mega
	"nvidia-a100-80gb":      80,  // A2 Ultra
	"nvidia-tesla-a100":     40,  // A2 Standard (A100 40GB)
	"nvidia-l4":             24,  // G2
}

func totalGPUMemory(gpuCount int, gpuModel string) int {
	return gpuCount * gpuMemoryByModel[gpuModel]
}

// localSSDPartitionGB returns the size in GB of a single bundled Local SSD
// partition for a machine type. Most machine series bundle Local SSD in
// 375 GB partitions; Titanium SSD series use larger disks whose sizes only
// appear in the per-series docs: Z3 is 3,000 GiB (6,000 GiB bare metal), C4
// bare metal is 3,000 GiB (c4-standard-288-lssd-metal: 6 x 3,000 GiB), and
// A4X/A4X Max bundle 12,000 GiB as 4 x 3,000 GiB (a4x-highgpu-4g and
// a4x-maxgpu-4g-metal).
func localSSDPartitionGB(machineTypeName string) int {
	nameLower := strings.ToLower(machineTypeName)
	isMetal := strings.HasSuffix(nameLower, "-metal")
	switch {
	case strings.HasPrefix(nameLower, "z3-") && isMetal:
		return 6000
	case strings.HasPrefix(nameLower, "z3-"):
		return 3000
	case strings.HasPrefix(nameLower, "c4-") && isMetal:
		return 3000
	case strings.HasPrefix(nameLower, "a4x-"):
		return 3000
	default:
		return 375
	}
}

// bundledLocalSSDCapacityGB returns the total bundled Local SSD capacity in GB
// for a machine type, or 0 when the shape has none. Only bundled capacity is
// reported: families where Local SSD is an optional per-VM attachment
// (N1/N2/N2D/C2/...) return 0 because attached disks are a user choice, not
// part of the machine type.
func bundledLocalSSDCapacityGB(mt MachineType) int {
	partitions := 0
	if mt.BundledLocalSsds != nil {
		partitions = mt.BundledLocalSsds.PartitionCount
	}
	if partitions <= 0 {
		return 0
	}
	return partitions * localSSDPartitionGB(mt.Name)
}

// Fetch all SKUs for Compute Engine with pagination
func fetchComputeSKUs() ([]SKU, error) {
	var allSKUs []SKU
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/v2beta/skus?pageSize=5000&filter=service=\"services/%s\"", GCP_BILLING_API_BASE, COMPUTE_SERVICE_ID)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response SKUsResponse
		if err := makeGCPAuthenticatedRequest(url, &response); err != nil {
			return nil, fmt.Errorf("failed to fetch SKUs: %w", err)
		}

		allSKUs = append(allSKUs, response.Skus...)

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
	}

	return allSKUs, nil
}

// Fetch pricing for all SKUs
func fetchPricing() (map[string]PriceInfo, error) {
	priceMap := make(map[string]PriceInfo)
	priceCandidates := make(map[string][]PriceInfo)
	stats := &priceSelectionStats{}
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/v1beta/skus/-/prices?pageSize=5000", GCP_BILLING_API_BASE)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response PricesResponse
		if err := makeGCPAuthenticatedRequest(url, &response); err != nil {
			return nil, fmt.Errorf("failed to fetch prices: %w", err)
		}

		for _, price := range response.Prices {
			stats.totalPriceRecords++

			// Extract SKU ID from the price name (format: "skus/SKUID/price")
			parts := strings.Split(price.Name, "/")
			if len(parts) >= 2 {
				skuID := parts[1]
				priceCandidates[skuID] = append(priceCandidates[skuID], price)
				stats.skuParsed++
			}
		}

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
		log.Printf("Fetched %d GCP prices so far...", stats.skuParsed)
	}

	for skuID, candidates := range priceCandidates {
		best, ok := selectBestPriceForSKU(candidates, stats)
		if !ok {
			continue
		}
		priceMap[skuID] = best
		stats.selected++
	}

	log.Printf(
		"Selected canonical GCP prices: selected=%d skus=%d totalRecords=%d rejected(nonUSD=%d nonRate=%d noTiers=%d unknownUnit=%d nonZeroTierStart=%d invalidAmount=%d nonDefaultUnitQty=%d ambiguous=%d)",
		stats.selected,
		len(priceCandidates),
		stats.totalPriceRecords,
		stats.rejectedNonUSD,
		stats.rejectedNonRate,
		stats.rejectedNoTiers,
		stats.rejectedUnknownUnit,
		stats.rejectedNonZeroStart,
		stats.rejectedInvalidAmount,
		stats.nonDefaultUnitQty,
		stats.ambiguousCandidates,
	)

	return priceMap, nil
}

func selectBestPriceForSKU(candidates []PriceInfo, stats *priceSelectionStats) (PriceInfo, bool) {
	type scoredCandidate struct {
		price        PriceInfo
		score        int
		hourlyPrice  float64
		preferHourly bool
		preferSingle bool
	}

	scored := make([]scoredCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		score, hourlyPrice, preferHourly, preferSingle, ok := scorePriceCandidate(candidate, stats)
		if !ok {
			continue
		}
		scored = append(scored, scoredCandidate{
			price:        candidate,
			score:        score,
			hourlyPrice:  hourlyPrice,
			preferHourly: preferHourly,
			preferSingle: preferSingle,
		})
	}

	if len(scored) == 0 {
		return PriceInfo{}, false
	}

	best := scored[0]
	tiedTop := 1
	for i := 1; i < len(scored); i++ {
		next := scored[i]
		if next.score > best.score {
			best = next
			tiedTop = 1
			continue
		}
		if next.score == best.score {
			tiedTop++

			// Prefer explicit hourly units over converted monthly values.
			if next.preferHourly != best.preferHourly {
				if next.preferHourly {
					best = next
				}
				continue
			}

			// Prefer single-tier list prices when score is equal.
			if next.preferSingle != best.preferSingle {
				if next.preferSingle {
					best = next
				}
				continue
			}

			// Final tie-breaker: choose the largest valid hourly price.
			if next.hourlyPrice > best.hourlyPrice {
				best = next
			}
		}
	}

	if tiedTop > 1 {
		stats.ambiguousCandidates++
	}

	return best.price, true
}

func scorePriceCandidate(price PriceInfo, stats *priceSelectionStats) (int, float64, bool, bool, bool) {
	if !strings.EqualFold(price.CurrencyCode, "USD") {
		stats.rejectedNonUSD++
		return 0, 0, false, false, false
	}

	if strings.ToLower(price.ValueType) != "rate" {
		stats.rejectedNonRate++
		return 0, 0, false, false, false
	}

	if len(price.Rate.Tiers) == 0 {
		stats.rejectedNoTiers++
		return 0, 0, false, false, false
	}

	unit := strings.ToLower(price.Rate.Unit.Unit)
	unitCategory := classifyGCPPriceUnit(unit)
	if unitCategory == "" {
		stats.rejectedUnknownUnit++
		return 0, 0, false, false, false
	}

	firstTier := price.Rate.Tiers[0]
	firstTierStart, ok := moneyToFloat(firstTier.StartAmount)
	if !ok {
		stats.rejectedInvalidAmount++
		return 0, 0, false, false, false
	}
	if firstTierStart != 0 {
		stats.rejectedNonZeroStart++
		return 0, 0, false, false, false
	}

	hourlyPrice := calculateHourlyPrice(price)
	if hourlyPrice <= 0 {
		stats.rejectedInvalidAmount++
		return 0, 0, false, false, false
	}

	if quantity := normalizedUnitQuantity(price.Rate.Unit.UnitQuantity); quantity != 1 {
		stats.nonDefaultUnitQty++
	}

	score := 100
	preferHourly := unitCategory == "hourly"
	preferSingle := len(price.Rate.Tiers) == 1
	if preferHourly {
		score += 20
	}
	if preferSingle {
		score += 10
	}

	return score, hourlyPrice, preferHourly, preferSingle, true
}

func classifyGCPPriceUnit(unit string) string {
	unit = strings.ToLower(strings.TrimSpace(unit))
	switch unit {
	case "h", "giby.h", "gby.h":
		return "hourly"
	}

	if strings.Contains(unit, "month") || strings.Contains(unit, "mo") {
		return "monthly"
	}

	return ""
}

func moneyToFloat(money Money) (float64, bool) {
	dollars := 0.0
	if money.Units != "" {
		parsed, err := strconv.ParseInt(money.Units, 10, 64)
		if err != nil {
			return 0, false
		}
		dollars = float64(parsed)
	}

	dollars += float64(money.Nanos) / 1e9
	return dollars, true
}

func normalizedUnitQuantity(quantity Money) float64 {
	// Default quantity is 1 when the API omits the field.
	parsedQuantity, ok := moneyToFloat(quantity)
	if !ok || parsedQuantity <= 0 {
		return 1
	}
	return parsedQuantity
}

// fetchMachineTypes fetches all machine types from the Compute Engine API
func fetchMachineTypes() (map[string]*MachineSpecs, error) {
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		return nil, fmt.Errorf("GCP_PROJECT_ID must be set")
	}

	machineSpecs := make(map[string]*MachineSpecs)
	var mu sync.Mutex
	pageToken := ""

	log.Println("Fetching GCP machine types from Compute Engine API...")

	for {
		url := fmt.Sprintf("%s/projects/%s/aggregated/machineTypes?maxResults=500", GCP_COMPUTE_API_BASE, projectID)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response AggregatedMachineTypesResponse
		if err := makeGCPAuthenticatedRequest(url, &response); err != nil {
			return nil, fmt.Errorf("failed to fetch machine types: %w", err)
		}

		// Process each zone's machine types
		for zonePath, scopedList := range response.Items {
			// Extract zone name from path like "zones/us-central1-a"
			zoneParts := strings.Split(zonePath, "/")
			zone := ""
			if len(zoneParts) >= 2 {
				zone = zoneParts[1]
			}

			for _, mt := range scopedList.MachineTypes {
				// Skip custom machine types
				if strings.Contains(mt.Name, "custom") {
					continue
				}

				mu.Lock()
				if existing, ok := machineSpecs[mt.Name]; ok {
					// Add zone to existing entry
					existing.Zones = append(existing.Zones, zone)
				} else {
					// Create new entry
					family := determineMachineFamily(mt.Name)
					specs := &MachineSpecs{
						VCPU:        mt.GuestCpus,
						MemoryGB:    float64(mt.MemoryMb) / 1024.0,
						Family:      family,
						IsSharedCPU: mt.IsSharedCpu,
						Zones:       []string{zone},
						LocalSSDGB:  bundledLocalSSDCapacityGB(mt),
					}

					// Handle GPUs/accelerators
					if len(mt.Accelerators) > 0 {
						specs.GPU = mt.Accelerators[0].GuestAcceleratorCount
						specs.GPUModel = mt.Accelerators[0].GuestAcceleratorType
						// Per-GPU memory is not exposed by the Compute Engine
						// machineTypes API, so derive it from the model string
						// using the documented per-GPU memory map. GPU_memory
						// is total memory across all attached GPUs.
						specs.GPUMemory = totalGPUMemory(
							specs.GPU,
							specs.GPUModel,
						)
					}

					machineSpecs[mt.Name] = specs
				}
				mu.Unlock()
			}
		}

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
		log.Printf("Fetched %d GCP machine types so far...", len(machineSpecs))
	}

	log.Printf("Fetched %d unique GCP machine types", len(machineSpecs))
	return machineSpecs, nil
}

// determineMachineFamily determines the family category based on machine type name
func determineMachineFamily(name string) string {
	nameLower := strings.ToLower(name)

	// Check for specific patterns
	switch {
	// Storage optimized (checked ahead of the highmem rule below: every real
	// Z3 shape is named z3-highmem-*, so the memory-optimized "highmem" check
	// would otherwise shadow this case entirely)
	case strings.HasPrefix(nameLower, "z3-"):
		return "Storage optimized"

	// Network optimized
	case strings.HasPrefix(nameLower, "c4n-"):
		return "Network optimized"

	// Memory optimized
	case strings.Contains(nameLower, "highmem"),
		strings.Contains(nameLower, "megamem"),
		strings.Contains(nameLower, "ultramem"),
		strings.HasPrefix(nameLower, "m1-"),
		strings.HasPrefix(nameLower, "m2-"),
		strings.HasPrefix(nameLower, "m3-"),
		strings.HasPrefix(nameLower, "m4-"),
		strings.HasPrefix(nameLower, "m4n-"),
		strings.HasPrefix(nameLower, "x4-"):
		return "Memory optimized"

	// Compute optimized
	case strings.Contains(nameLower, "highcpu"),
		strings.HasPrefix(nameLower, "c2-"),
		strings.HasPrefix(nameLower, "c2d-"),
		strings.HasPrefix(nameLower, "c3-"),
		strings.HasPrefix(nameLower, "c3d-"),
		strings.HasPrefix(nameLower, "c4-"),
		strings.HasPrefix(nameLower, "c4a-"),
		strings.HasPrefix(nameLower, "c4d-"),
		strings.HasPrefix(nameLower, "h3-"),
		strings.HasPrefix(nameLower, "h4d-"):
		// c4-highmem and similar should be memory optimized
		if strings.Contains(nameLower, "highmem") {
			return "Memory optimized"
		}
		return "Compute optimized"

	// Accelerator optimized (GPU)
	case strings.HasPrefix(nameLower, "a2-"),
		strings.HasPrefix(nameLower, "a3-"),
		strings.HasPrefix(nameLower, "a4-"),
		strings.HasPrefix(nameLower, "a4x-"),
		strings.HasPrefix(nameLower, "g2-"),
		strings.HasPrefix(nameLower, "g4-"):
		return "Accelerator optimized"

	// General purpose (default)
	default:
		return "General purpose"
	}
}

// Parse machine type from display name
// Examples from GCP API:
// "N1 Predefined Instance Ram running in Zurich"
// "Spot Preemptible E2 Custom Instance Core running in Paris"
// "Compute optimized Core running in Americas"
// "Sole Tenancy Instance RAM running in Jakarta"
// "Licensing Fee for Windows Server 2012 BYOL (CPU cost)"
// "Licensing Fee for Windows Server 2012 BYOL (RAM cost)"
// m4ultramem224 is listed ahead of m4n/m4: m4-ultramem-224 is billed under its
// own dedicated "M4Ultramem224 Instance Core/Ram" SKU pair rather than the
// plain M4 rates that cover every other M4 shape (see the family-override
// comment in processGCPData for why this needs its own bucket).
//
// Accelerator exclusions: g4, a4 and a4x are deliberately absent. Their billing
// is dominated by a GPU charge this scraper does not assemble (G4: the
// "... RTX 6000 96GB ..." GPU SKUs; A4: it bills *solely* as bundled
// "A4 Nvidia B200 (1 gpu slice)" SKUs with no core/RAM SKUs to sum; A4X: no
// public SKUs yet), so emitting a core+RAM-only price would understate them.
// a2, a3 and g2 stay: they are pre-existing upstream coverage and dropping them
// would regress the current site. They share the same GPU-charge gap; a
// follow-up will price the GPU component behind a completeness guard, after
// which the excluded families can return.
var machineTypeRegex = regexp.MustCompile(`(?i)(n1|n2d|n2|n4d|n4a|n4|e2|e2a|c2|c2d|m1|m2|m3|m4ultramem224|m4n|m4|x4|t2d|t2a|a2|a3|g2|h3|h4d|c3|c3d|z3|c4a|c4d|c4n|c4)\b.*(?:instance\s+(core|ram)|\((?:cpu|ram)\s+cost\))`)

// legacySKURegex matches the first-generation SKU naming formats that predate
// the "<FAMILY> Instance Core/Ram" convention and carry no machine family token
// for machineTypeRegex to capture:
//
//	"Compute optimized Core running in Americas"          (C2, multi-regional)
//	"Compute optimized Instance Core running in Madrid"   (C2, per-region)
//	"Memory-optimized Instance Ram running in Frankfurt"  (M1)
//
// The "Instance" token is optional: C2's multi-regional SKUs omit it while its
// ~13 per-region SKUs (africa-south1, the me-* / europe-* newer regions, etc.)
// include it, and M1 always includes it. Without accepting the "Instance"
// variant the per-region C2 SKUs get no on-demand/spot baseline, which also
// drops their (correctly parsed) commitment SKUs at the CUD gate.
//
// Without this mapping the C2 and M1 series get no pricing at all and are
// dropped from the dataset entirely. M2 is billed as the M1 rates plus a
// separate "Memory Optimized Upgrade Premium for Memory-optimized Instance
// ..." SKU; the premium SKUs are excluded by the caller so they never
// pollute M1 baseline pricing.
var legacySKURegex = regexp.MustCompile(`(?i)\b(compute optimized|memory-optimized)(?:\s+instance)?\s+(core|ram)\b`)

// Resource-based committed use discount (CUD) SKUs use a distinct display-name
// format from on-demand instance SKUs, e.g.:
//
//	"Commitment v1: N2 Cpu in Americas for 1 Year"
//	"Commitment v1: C2D AMD Ram in EMEA for 3 Year"
//
// The family token may carry a vendor qualifier ("AMD") before the resource
// keyword; the term is "1 Year" or "3 Year". An optional skip group consumes
// such qualifiers so the resource keyword (Cpu/Ram) is captured directly.
//
// The g4/a4/a4x accelerator families are excluded here for the same reason as in
// machineTypeRegex: their instances publish no core+RAM price, so their
// commitment SKUs have nothing to attach to. Keep this allowlist in sync with
// machineTypeRegex.
var cudSKURegex = regexp.MustCompile(`(?i)^commitment\s+v\d+:\s+(n1|n2d|n2|n4d|n4a|n4|e2|e2a|c2|c2d|m1|m2|m3|m4ultramem224|m4n|m4|x4|t2d|t2a|a2|a3|g2|h3|h4d|c3|c3d|z3|c4a|c4d|c4n|c4)\s+(?:[a-z0-9]+\s+)*?(cpu|ram)\s+in\s+.+\s+for\s+(1|3)\s+year`)

// CUD commitment terms used as keys in the CUD pricing buckets.
const (
	cudTerm1Yr = "1yr"
	cudTerm3Yr = "3yr"
)

// parseCUDSKU parses a resource-based committed use discount SKU. It returns the
// machine family (uppercased, e.g. "N2"), resource type ("core" or "ram"), the
// commitment term ("1yr" or "3yr"), and whether the SKU is a CUD SKU at all.
// Region resolution is left to the shared geo-taxonomy machinery (the same path
// on-demand SKUs use), so the region groupings in the display name are ignored.
func parseCUDSKU(sku SKU) (machineFamily string, resourceType string, term string, ok bool) {
	matches := cudSKURegex.FindStringSubmatch(sku.DisplayName)
	if len(matches) < 4 {
		return "", "", "", false
	}

	machineFamily = strings.ToUpper(matches[1])

	switch strings.ToLower(matches[2]) {
	case "cpu":
		resourceType = "core"
	case "ram":
		resourceType = "ram"
	default:
		return "", "", "", false
	}

	switch matches[3] {
	case "1":
		term = cudTerm1Yr
	case "3":
		term = cudTerm3Yr
	default:
		return "", "", "", false
	}

	return machineFamily, resourceType, term, true
}

// Local SSD usage SKU display names come in two forms: a per-family form used
// by newer machine series and a generic catch-all form, each with a spot
// variant:
//
//	"C4D Instance Local SSD running in Frankfurt"
//	"Spot Preemptible C4D Instance Local SSD running in Frankfurt"
//	"SSD backed Local Storage in Paris"
//	"SSD backed Local Storage attached to Spot Preemptible VMs in Paris"
//
// The generic form's region tail varies ("in <city>", "running in <region>",
// or none at all for the legacy multi-regional SKUs covering asia-east1,
// europe-west1, us-central1, us-east1 and us-west1); the prefix-anchored
// pattern matches all of them.
//
// Commitment SKUs ("Commitment v1: C4D Local SSD in ... for 1 Year") and
// suspended-VM state SKUs ("VM state: preserved local SSD in ...") must not
// feed baseline pricing; both anchored patterns reject them because the
// display name does not start with a "<family> Instance Local SSD" or
// "SSD backed Local Storage" prefix.
var familyLocalSSDSKURegex = regexp.MustCompile(`(?i)^(?:spot\s+preemptible\s+)?([a-z][a-z0-9]{1,3})\s+instance\s+local\s+ssd\b`)
var genericLocalSSDSKURegex = regexp.MustCompile(`(?i)^ssd\s+backed\s+local\s+storage\b`)

// parseLocalSSDSKU parses a Local SSD usage SKU. It returns the machine family
// the SKU is scoped to (uppercased, e.g. "C4D"; empty for the generic
// "SSD backed Local Storage" SKUs that apply to any family) and whether the
// SKU carries spot/preemptible rates. Rates are per GiB-month in the catalog;
// calculateHourlyPrice converts them to per GiB-hour.
func parseLocalSSDSKU(sku SKU) (machineFamily string, isSpot bool, ok bool) {
	displayName := sku.DisplayName
	displayLower := strings.ToLower(displayName)

	// Reservation-scheduling products (DWS calendar mode / flex-start) bill
	// Local SSD under their own SKUs and must not feed baseline pricing.
	if strings.Contains(displayLower, "calendar") || strings.Contains(displayLower, "flex") {
		return "", false, false
	}

	isSpot = strings.Contains(displayLower, "preemptible") || strings.Contains(displayLower, "spot")

	if matches := familyLocalSSDSKURegex.FindStringSubmatch(displayName); len(matches) >= 2 {
		return strings.ToUpper(matches[1]), isSpot, true
	}
	if genericLocalSSDSKURegex.MatchString(displayName) {
		return "", isSpot, true
	}
	return "", false, false
}

// memoryOptimizedPremiumSKURegex matches the "Memory Optimized Upgrade
// Premium" surcharge SKUs that, added on top of the M1 base core/RAM rates,
// constitute M2 pricing (M2 has no dedicated SKUs of its own):
//
//	"Memory Optimized Upgrade Premium for Memory-optimized Instance Core running in Americas"
//	"Memory Optimized Upgrade Premium for Memory-optimized Instance Ram running in Frankfurt"
//
// These exist only as plain on-demand SKUs; the catalog has no Spot or
// committed-use variant of the premium, so M2 Spot and CUD prices cannot be
// synthesized (see processGCPData).
var memoryOptimizedPremiumSKURegex = regexp.MustCompile(`(?i)^memory optimized upgrade premium for memory-optimized instance\s+(core|ram)\b`)

// parseMemoryOptimizedPremiumSKU reports whether a SKU is a Memory Optimized
// Upgrade Premium surcharge and, if so, which resource ("core" or "ram") it
// applies to. Region resolution is left to the shared geo-taxonomy machinery.
func parseMemoryOptimizedPremiumSKU(sku SKU) (resourceType string, ok bool) {
	matches := memoryOptimizedPremiumSKURegex.FindStringSubmatch(sku.DisplayName)
	if len(matches) < 2 {
		return "", false
	}
	return strings.ToLower(matches[1]), true
}

// skuRegion resolves the region code for a SKU from its geo taxonomy, falling
// back to the multi-regional grouping named in the display name (e.g.
// "running in Americas" -> "multi-americas").
// multiRegionalMetadataRegions returns the explicit region list of a
// multi-regional SKU. Nearly all Local SSD SKUs are regional, with the region
// resolvable from the display name ("SSD backed Local Storage in Milan").
// The exception is Google's five original regions (asia-east1, europe-west1,
// us-central1, us-east1, us-west1): they predate per-region SKU naming and
// Google never retro-created regional SKUs for them, so their generic Local
// SSD price exists only on the bare legacy SKUs ("SSD backed Local Storage"
// and its Spot Preemptible variant), whose region list lives solely in this
// metadata.
func multiRegionalMetadataRegions(sku SKU) []string {
	if sku.GeoTaxonomy.MultiRegionalMetadata == nil {
		return nil
	}
	regions := make([]string, 0, len(sku.GeoTaxonomy.MultiRegionalMetadata.Regions))
	for _, r := range sku.GeoTaxonomy.MultiRegionalMetadata.Regions {
		if r.Region != "" {
			regions = append(regions, r.Region)
		}
	}
	return regions
}

func skuRegion(sku SKU) string {
	if len(sku.GeoTaxonomy.Regions) > 0 {
		// Use the first region as a fallback; callers can read full Regions.
		return sku.GeoTaxonomy.Regions[0]
	}
	if sku.GeoTaxonomy.RegionalMetadata != nil {
		return sku.GeoTaxonomy.RegionalMetadata.Region.Region
	}
	if sku.GeoTaxonomy.Type == "TYPE_MULTI_REGIONAL" {
		displayLower := strings.ToLower(sku.DisplayName)
		switch {
		case strings.Contains(displayLower, "americas"):
			return "multi-americas"
		case strings.Contains(displayLower, "europe"):
			return "multi-europe"
		case strings.Contains(displayLower, "asia"):
			return "multi-asia"
		}
	}
	return ""
}

func parseMachineTypeFromSKU(sku SKU) (machineFamily string, resourceType string, region string, isSpot bool, isWindows bool) {
	displayName := sku.DisplayName

	// Check if it's spot/preemptible
	isSpot = strings.Contains(strings.ToLower(displayName), "preemptible") ||
		strings.Contains(strings.ToLower(displayName), "spot")

	// Check if it's Windows pricing
	isWindows = strings.Contains(strings.ToLower(displayName), "windows")

	// Parse machine family and resource type
	matches := machineTypeRegex.FindStringSubmatch(displayName)
	if len(matches) >= 2 {
		machineFamily = strings.ToUpper(matches[1])
		// Check if we have a captured resource type (from instance core/ram)
		if len(matches) >= 3 && matches[2] != "" {
			resourceType = strings.ToLower(matches[2])
		} else {
			// Parse from licensing fee format "(CPU cost)" or "(RAM cost)"
			displayLower := strings.ToLower(displayName)
			if strings.Contains(displayLower, "cpu cost") || strings.Contains(displayLower, "core") {
				resourceType = "core"
			} else if strings.Contains(displayLower, "ram cost") {
				resourceType = "ram"
			}
		}
	}

	// Fall back to the legacy first-generation SKU naming used by C2 and M1,
	// which carries no family token. The "Upgrade Premium" surcharge SKUs
	// (how M2 is billed on top of the M1 rates) must not map to the M1
	// baseline rates, so they are excluded here.
	if machineFamily == "" && !strings.Contains(strings.ToLower(displayName), "premium") {
		if legacyMatches := legacySKURegex.FindStringSubmatch(displayName); len(legacyMatches) >= 3 {
			switch strings.ToLower(legacyMatches[1]) {
			case "compute optimized":
				machineFamily = "C2"
			case "memory-optimized":
				machineFamily = "M1"
			}
			resourceType = strings.ToLower(legacyMatches[2])
		}
	}

	// Get region from geo taxonomy (multi-regional SKUs resolve to a special
	// "multi-*" region identifier).
	region = skuRegion(sku)

	return
}

// Calculate hourly price from GCP pricing tier
func calculateHourlyPrice(price PriceInfo) float64 {
	if strings.ToLower(price.ValueType) != "rate" || len(price.Rate.Tiers) == 0 {
		return 0
	}

	// Only use tier-0 list price records.
	// Other tiers require usage context that this scraper does not model.
	tier := price.Rate.Tiers[0]
	firstTierStart, ok := moneyToFloat(tier.StartAmount)
	if !ok || firstTierStart != 0 {
		return 0
	}

	dollars, ok := moneyToFloat(tier.ListPrice)
	if !ok {
		return 0
	}

	// Normalize per-unit pricing when a non-default unit quantity is provided.
	unitQuantity := normalizedUnitQuantity(price.Rate.Unit.UnitQuantity)
	dollars = dollars / unitQuantity

	// GCP pricing is often per hour, but check the unit
	unit := strings.ToLower(price.Rate.Unit.Unit)
	unitCategory := classifyGCPPriceUnit(unit)
	if unitCategory == "monthly" {
		// Convert monthly to hourly (assuming 730 hours per month)
		dollars = dollars / 730
	} else if unitCategory == "" {
		utils.SendWarning("Skipping unsupported GCP pricing unit:", unit)
		return 0
	}

	// Almost every RAM SKU is rated per binary GiB ("GiBy.h"), matching
	// MachineSpecs.MemoryGB (== memoryMb/1024, i.e. GiB). A handful of newer
	// SKU families (seen so far: C4D, M4Ultramem224) are instead rated per
	// decimal GB ("GBy.h"). Scale those up to a per-GiB rate so the shared
	// vCPU/RAM total-price math downstream can keep treating every rate as
	// per-GiB regardless of which unit the catalog happened to use.
	if unit == "gby.h" {
		dollars *= gibPerDecimalGB
	}

	return dollars
}

// gibPerDecimalGB is how many decimal gigabytes (1000^3 bytes) fit in one
// binary gibibyte (1024^3 bytes).
const gibPerDecimalGB = 1024 * 1024 * 1024 / 1e9

// GCP Region from API
type GCPRegion struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type RegionsResponse struct {
	Items         []GCPRegion `json:"items"`
	NextPageToken string      `json:"nextPageToken"`
}

// fetchRegions fetches all regions from the Compute Engine API
func fetchRegions() (map[string]string, error) {
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		return nil, fmt.Errorf("GCP_PROJECT_ID must be set")
	}

	regions := make(map[string]string)
	pageToken := ""

	log.Println("Fetching GCP regions from Compute Engine API...")

	for {
		url := fmt.Sprintf("%s/projects/%s/regions?maxResults=500", GCP_COMPUTE_API_BASE, projectID)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response RegionsResponse
		if err := makeGCPAuthenticatedRequest(url, &response); err != nil {
			return nil, fmt.Errorf("failed to fetch regions: %w", err)
		}

		for _, region := range response.Items {
			// Use friendly name if available, otherwise use the region code
			displayName := getRegionFriendlyName(region.Name)
			regions[region.Name] = displayName
		}

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
	}

	log.Printf("Fetched %d GCP regions", len(regions))
	return regions, nil
}

// getRegionFriendlyName returns a human-friendly name for a region
// GCP API doesn't provide these, so we map known ones
func getRegionFriendlyName(region string) string {
	// Known friendly names (GCP doesn't provide these via API)
	friendlyNames := map[string]string{
		"us-central1":             "Iowa",
		"us-east1":                "South Carolina",
		"us-east4":                "Northern Virginia",
		"us-east5":                "Columbus",
		"us-east7":                "Alabama",
		"us-south1":               "Dallas",
		"us-west1":                "Oregon",
		"us-west2":                "Los Angeles",
		"us-west3":                "Salt Lake City",
		"us-west4":                "Las Vegas",
		"us-west8":                "Phoenix",
		"northamerica-northeast1": "Montreal",
		"northamerica-northeast2": "Toronto",
		"northamerica-south1":     "Mexico",
		"southamerica-east1":      "São Paulo",
		"southamerica-west1":      "Santiago",
		"europe-central2":         "Warsaw",
		"europe-north1":           "Finland",
		"europe-north2":           "Sweden",
		"europe-southwest1":       "Madrid",
		"europe-west1":            "Belgium",
		"europe-west2":            "London",
		"europe-west3":            "Frankfurt",
		"europe-west4":            "Netherlands",
		"europe-west5":            "Zurich",
		"europe-west6":            "Zurich",
		"europe-west8":            "Milan",
		"europe-west9":            "Paris",
		"europe-west10":           "Berlin",
		"europe-west12":           "Turin",
		"asia-east1":              "Taiwan",
		"asia-east2":              "Hong Kong",
		"asia-northeast1":         "Tokyo",
		"asia-northeast2":         "Osaka",
		"asia-northeast3":         "Seoul",
		"asia-south1":             "Mumbai",
		"asia-south2":             "Delhi",
		"asia-southeast1":         "Singapore",
		"asia-southeast2":         "Jakarta",
		"asia-southeast3":         "Bangkok",
		"australia-southeast1":    "Sydney",
		"australia-southeast2":    "Melbourne",
		"me-central1":             "Doha",
		"me-central2":             "Dammam",
		"me-west1":                "Tel Aviv",
		"africa-south1":           "Johannesburg",
		// Multi-regional billing identifiers
		"multi-americas": "Americas",
		"multi-europe":   "Europe",
		"multi-asia":     "Asia Pacific",
	}

	if name, ok := friendlyNames[region]; ok {
		return name
	}
	// Return region code if no friendly name known
	return region
}

// Create pretty name from instance type
func createPrettyName(instanceType string) string {
	parts := strings.Split(instanceType, "-")
	if len(parts) < 2 {
		return instanceType
	}

	family := strings.ToUpper(parts[0])
	variant := parts[1]

	var prettyVariant string
	switch variant {
	case "standard":
		prettyVariant = "Standard"
	case "highmem":
		prettyVariant = "High Memory"
	case "highcpu":
		prettyVariant = "High CPU"
	case "megamem":
		prettyVariant = "Mega Memory"
	case "ultramem":
		prettyVariant = "Ultra Memory"
	default:
		prettyVariant = strings.Title(variant)
	}

	if len(parts) > 2 {
		return fmt.Sprintf("%s %s %s", family, prettyVariant, strings.Join(parts[2:], " "))
	}
	return fmt.Sprintf("%s %s", family, prettyVariant)
}

// Format price as string with proper decimal places
func formatPrice(price float64) string {
	return strconv.FormatFloat(price, 'f', -1, 64)
}
