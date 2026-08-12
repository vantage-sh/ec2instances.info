package gcp

import (
	"fmt"
	"log"
	"maps"
	"scraper/utils"
	"slices"
	"sort"
	"strconv"
	"strings"
)

func taxonomyValues(sku SKU) []string {
	values := make([]string, 0, len(sku.ProductTaxonomy.TaxonomyCategories))
	for _, category := range sku.ProductTaxonomy.TaxonomyCategories {
		if category.Category == "" {
			continue
		}
		values = append(values, strings.ToLower(category.Category))
	}
	return values
}

func taxonomyContainsAny(values []string, needles ...string) bool {
	for _, value := range values {
		for _, needle := range needles {
			if strings.Contains(value, needle) {
				return true
			}
		}
	}
	return false
}

func shouldUseSKUForPricing(sku SKU, isSpot bool, displayLower string) bool {
	// Sole tenancy SKUs are dedicated-host style charges and should not be
	// mixed into baseline VM on-demand/spot instance pricing.
	if strings.Contains(displayLower, "sole tenancy") {
		return false
	}

	// Reservation-scheduling products (Dynamic Workload Scheduler calendar mode
	// and flex-start) are separately-priced products, not a cheaper way to buy
	// the same VM, and must not feed baseline pricing. Only the "DWS Calendar
	// Mode H4D Instance Core/Ram" pair currently reaches this far -- the other
	// DWS families spell their SKUs "<FAMILY> Core" with no "Instance", so
	// machineTypeRegex never claims them -- but that is an accident of Google's
	// naming, and it left H4D correct only because the duplicate happened to be
	// the cheaper of the two. parseLocalSSDSKU gates the Local SSD twins of
	// these same products.
	if strings.Contains(displayLower, "dws") ||
		strings.Contains(displayLower, "calendar") ||
		strings.Contains(displayLower, "flex start") {
		return false
	}

	if !isSpot {
		if strings.Contains(displayLower, "commit") ||
			strings.Contains(displayLower, "cud") ||
			strings.Contains(displayLower, "sustained") ||
			strings.Contains(displayLower, "discount") ||
			strings.Contains(displayLower, "reservation") ||
			strings.Contains(displayLower, "reserved") ||
			strings.Contains(displayLower, "saving") {
			return false
		}
	}

	taxonomy := taxonomyValues(sku)
	if len(taxonomy) == 0 {
		return true
	}

	hasSpotCategory := taxonomyContainsAny(taxonomy, "spot", "preemptible")
	if isSpot {
		// Spot pricing should come from explicit spot/preemptible categories.
		return hasSpotCategory
	}

	if hasSpotCategory {
		return false
	}

	// Exclude commitment/discount style SKU categories from baseline on-demand pricing.
	if taxonomyContainsAny(taxonomy, "commit", "cud", "discount", "sustained", "reservation", "reserved", "saving") {
		return false
	}

	return true
}

// shouldUseLocalSSDSKUForPricing gates Local SSD usage SKUs. Unlike instance
// SKUs, spot cannot be validated against the taxonomy: Google categorizes the
// generic "SSD backed Local Storage attached to Spot Preemptible VMs" SKUs as
// "On Demand", so the display name (already parsed by parseLocalSSDSKU) is
// authoritative for spot. Commitment/reservation-style categories are still
// excluded as a backstop to parseLocalSSDSKU's display-name anchoring.
func shouldUseLocalSSDSKUForPricing(sku SKU, displayLower string) bool {
	if strings.Contains(displayLower, "sole tenancy") {
		return false
	}
	return !taxonomyContainsAny(taxonomyValues(sku),
		"commit", "cud", "discount", "sustained", "reservation", "reserved", "saving")
}

func targetRegionsForSKU(sku SKU, fallbackRegion string) []string {
	if len(sku.GeoTaxonomy.Regions) > 0 {
		return sku.GeoTaxonomy.Regions
	}
	if fallbackRegion == "" {
		return nil
	}
	return []string{fallbackRegion}
}

// cudTargetRegions resolves the region codes a committed use discount SKU
// applies to. Resource-based CUD SKUs carry explicit region codes in their geo
// taxonomy in most cases; for multi-regional commitment SKUs the geo taxonomy
// has no region list, so the broad grouping is taken from the display name
// ("Americas" / "EMEA" / "APAC"), mapped to the same multi-region identifiers
// on-demand pricing uses. EMEA/APAC differ from the on-demand wording
// (europe/asia), so this is resolved here rather than via parseMachineTypeFromSKU.
func cudTargetRegions(sku SKU) []string {
	if len(sku.GeoTaxonomy.Regions) > 0 {
		return sku.GeoTaxonomy.Regions
	}
	if sku.GeoTaxonomy.RegionalMetadata != nil && sku.GeoTaxonomy.RegionalMetadata.Region.Region != "" {
		return []string{sku.GeoTaxonomy.RegionalMetadata.Region.Region}
	}

	displayLower := strings.ToLower(sku.DisplayName)
	switch {
	case strings.Contains(displayLower, "americas"):
		return []string{"multi-americas"}
	case strings.Contains(displayLower, "emea"), strings.Contains(displayLower, "europe"):
		return []string{"multi-europe"}
	case strings.Contains(displayLower, "apac"), strings.Contains(displayLower, "asia"):
		return []string{"multi-asia"}
	}
	return nil
}

func expandedRegionsForMultiRegion(region string) []string {
	switch region {
	case "multi-americas":
		return []string{"us-central1", "us-east1", "us-east4", "us-east5", "us-south1", "us-west1", "us-west2", "us-west3", "us-west4", "northamerica-northeast1", "northamerica-northeast2", "southamerica-east1", "southamerica-west1"}
	case "multi-europe":
		return []string{"europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west6", "europe-west8", "europe-west9", "europe-north1", "europe-central2", "europe-southwest1"}
	case "multi-asia":
		return []string{"asia-east1", "asia-east2", "asia-northeast1", "asia-northeast2", "asia-northeast3", "asia-south1", "asia-south2", "asia-southeast1", "asia-southeast2", "australia-southeast1", "australia-southeast2"}
	default:
		return nil
	}
}

// bundledSSDBillsAtGenericRate are the machine families whose bundled Local SSD
// is billed at the generic "SSD backed Local Storage" rate even though the
// catalog also carries a per-family Local SSD SKU for them.
//
// Google's published prices decide this, and they split cleanly. C4, C4A, C4D
// and H4D bundled shapes are built from their own per-family rate in every
// region where the two rates differ. Z3 is built from the generic rate in every
// such region, on all four price columns -- most decisively on Spot, where the
// Z3 rate differs from the generic rate in 42 of 47 regions: reconstructing the
// published total as vCPU x core + RAM x ram + capacity x ssd from the catalog's
// own Z3 core and RAM SKUs lands on the generic SSD rate in 363 of 363 cells and
// on the Z3 SSD rate in none. The page uses per-family core and RAM alongside a
// generic SSD rate inside the same arithmetic, so this is a deliberate
// asymmetry rather than a lookup the page generator skipped.
//
// What the per-family Z3 Local SSD SKU does price is unknown. It is not the
// bare z3-highmem-88/176 shapes: those are spec-identical aliases of
// z3-highmem-88-highlssd and z3-highmem-176-standardlssd, so there is no
// distinct product for it to apply to.
//
// Keys are uppercase to match machineFamily, which is uppercased at its source.
// A lowercase key here would make this map a silent no-op.
var bundledSSDBillsAtGenericRate = map[string]bool{"Z3": true}

// ssdFamilyPrecedence is the order to try Local SSD rate buckets for a family,
// where "" is the generic bucket. Reversing the order rather than dropping the
// per-family SKU keeps the losing bucket as a fallback: c4/asia-southeast3 is
// live proof that a family can have a rate in one bucket and nothing in the
// other, so neither bucket can be assumed present.
func ssdFamilyPrecedence(family string) []string {
	if bundledSSDBillsAtGenericRate[family] {
		return []string{"", family}
	}
	return []string{family, ""}
}

// regionalPrice is a candidate price for one region, tagged with how it got
// there. A multi-regional SKU ("... running in Americas") is expanded into every
// member region so those regions have a price at all, but where Google also
// publishes a SKU scoped to the region itself, that one is what it bills.
type regionalPrice struct {
	PriceInfo
	fromMultiRegion bool
}

func regionScoped(price PriceInfo) regionalPrice {
	return regionalPrice{PriceInfo: price}
}

func multiRegionFallback(price PriceInfo) regionalPrice {
	return regionalPrice{PriceInfo: price, fromMultiRegion: true}
}

// selectHourlyPrice picks one rate from the candidates for a region.
//
// Candidates scoped to the region win outright over rates inherited from a
// multi-regional SKU ("... running in Americas"), which is only ever a fallback
// for regions Google publishes no scoped SKU for. Mixing the two tiers into a
// single min or max is wrong in both directions: taking the min let the cheaper
// Americas rate beat us-east5's own on Spot, putting Z3 shapes 27% under
// Google's published price with every Americas region collapsed to one number,
// and taking the max would let a multi-regional rate that happens to exceed the
// region's own win on demand.
//
// Within the winning tier the highest rate wins. Two region-scoped SKUs at
// different prices are a duplicated catalog entry rather than a cheaper option,
// and the higher rate reproduces Google's published price in every M1
// memory-optimized case (us-east4, asia-northeast1, asia-southeast1) except one:
// asia-southeast1 on-demand core, where Google bills the lower of the two. That
// exception costs +0.035% on four cells and no field in the SKU record predicts
// it, so it is left as-is rather than encoded as a per-region table. The
// ambiguity warning names every such bucket, so a future region where Google
// bills the lower twin shows up instead of passing unnoticed.
func selectHourlyPrice(candidates []regionalPrice) (float64, bool) {
	if scoped := regionScopedOnly(candidates); len(scoped) > 0 {
		candidates = scoped
	}

	var selected float64
	hasValue := false

	for _, candidate := range candidates {
		hourlyPrice := calculateHourlyPrice(candidate.PriceInfo)
		if hourlyPrice <= 0 {
			continue
		}

		if !hasValue || hourlyPrice > selected {
			selected = hourlyPrice
			hasValue = true
		}
	}

	return selected, hasValue
}

// ambiguousRateKeys labels every rate bucket whose winning tier holds more than
// one distinct rate, so a duplicated catalog entry is reported rather than
// silently resolved by selectHourlyPrice's max.
//
// Callers cover the instance, CUD and Memory Optimized Upgrade Premium buckets.
// Local SSD, Local SSD CUD and Windows license buckets are not covered: none has
// a duplicate in the live catalog today, so wiring them would add reporting for a
// case that has never occurred. This is therefore not a count of every ambiguous
// bucket in the catalog, only of the three pools that have ever had one.
func ambiguousRateKeys[K comparable](data map[K][]regionalPrice, label func(K) string) []string {
	var ambiguous []string
	for key, candidates := range data {
		if distinctScopedRates(candidates) > 1 {
			ambiguous = append(ambiguous, label(key))
		}
	}
	return ambiguous
}

// distinctScopedRates counts the distinct usable rates among the candidates
// scoped to the region. Anything above 1 means two SKUs Google scopes to the same
// region disagree on price, and selectHourlyPrice's max is standing in for a
// product-classification question rather than reading a single published rate.
//
// The multi-regional tier is deliberately not counted. A duplicate there expands
// into every member region, so one disagreeing pair of "... running in Americas"
// SKUs would report fourteen regions and drown out the per-region case this
// exists to surface.
func distinctScopedRates(candidates []regionalPrice) int {
	rates := make(map[float64]bool)
	for _, candidate := range candidates {
		if candidate.fromMultiRegion {
			continue
		}
		if hourlyPrice := calculateHourlyPrice(candidate.PriceInfo); hourlyPrice > 0 {
			rates[hourlyPrice] = true
		}
	}
	return len(rates)
}

// regionScopedOnly returns the candidates that came from a SKU scoped to the
// region, dropping multi-regional inheritances. A candidate with no usable
// hourly price does not count as scoped coverage, so a $0 or malformed regional
// SKU cannot suppress a valid multi-regional fallback.
func regionScopedOnly(candidates []regionalPrice) []regionalPrice {
	scoped := make([]regionalPrice, 0, len(candidates))
	for _, candidate := range candidates {
		if !candidate.fromMultiRegion && calculateHourlyPrice(candidate.PriceInfo) > 0 {
			scoped = append(scoped, candidate)
		}
	}
	return scoped
}

// Process SKUs and pricing data to generate GCP instances
func processGCPData(skus []SKU, pricing map[string]PriceInfo, machineSpecs map[string]*MachineSpecs, regions map[string]string) map[string]*GCPInstance {
	instances := make(map[string]*GCPInstance)

	// Group SKUs by machine type and region
	type skuKey struct {
		machineType  string
		region       string
		isSpot       bool
		isWindows    bool
		resourceType string
	}

	skuData := make(map[skuKey][]regionalPrice)

	// Resource-based committed use discount (CUD) pricing, kept entirely separate
	// from on-demand/spot so commitment rates never bleed into baseline pricing.
	type cudKey struct {
		machineType  string
		region       string
		term         string // cudTerm1Yr or cudTerm3Yr
		resourceType string // "core" or "ram"
	}
	cudData := make(map[cudKey][]regionalPrice)
	cudSKUCount := 0

	// Local SSD committed-use discount pricing, keyed by machine family ("" for
	// the generic "Commitment v1: Local SSD" SKUs), region, and term. These per
	// GiB-month commitment rates are folded into the CUD price of bundled
	// Local SSD shapes exactly as the on-demand ssdData rates are folded into
	// on-demand/spot pricing, so a shape's CUD price covers its bundled SSD too.
	type ssdCudKey struct {
		family string
		region string
		term   string // cudTerm1Yr or cudTerm3Yr
	}
	ssdCudData := make(map[ssdCudKey][]regionalPrice)
	ssdCudSKUCount := 0

	// Local SSD usage pricing, keyed by machine family ("" for the generic
	// "SSD backed Local Storage" SKUs), region, and spot. These per GiB-month
	// rates are folded into the total price of machine types that come with
	// bundled Local SSD (Z3, the -lssd shapes, accelerator series), because
	// Google bills the bundled capacity on top of the core/RAM rates.
	type localSSDKey struct {
		family string
		region string
		isSpot bool
	}
	ssdData := make(map[localSSDKey][]regionalPrice)
	localSSDSKUCount := 0

	// Memory Optimized Upgrade Premium pricing, keyed by region and resource
	// ("core"/"ram"). M2 has no SKUs of its own; Google bills it as the M1 base
	// core/RAM rates plus this per-region surcharge, so these rates are folded
	// into synthesized M2 on-demand pricing below.
	type premiumKey struct {
		region       string
		resourceType string
	}
	premiumData := make(map[premiumKey][]regionalPrice)
	memoryPremiumSKUCount := 0

	// Store Windows license fees separately (they're global, not region-specific)
	type windowsLicenseType struct {
		resourceType string // "core" or "ram"
	}
	windowsLicenses := make(map[windowsLicenseType][]regionalPrice)

	// Debug counters
	instanceSKUCount := 0
	parsedSKUCount := 0
	pricedSKUCount := 0
	windowsSKUCount := 0
	skippedByTaxonomyCount := 0
	duplicatePriceKeys := 0

	for _, sku := range skus {
		displayLower := strings.ToLower(sku.DisplayName)

		// Check for Windows Server licensing fees (generic, apply to all instances)
		// Look for patterns like "Licensing Fee for Windows Server 2016 Datacenter Edition (CPU cost)"
		// Prefer Datacenter Edition over BYOL (BYOL has $0 cost)
		if strings.Contains(displayLower, "licensing fee for windows server") &&
			(strings.Contains(displayLower, "cpu cost)") || strings.Contains(displayLower, "ram cost)")) &&
			!strings.Contains(displayLower, "byol") { // Skip BYOL - it's $0

			// Determine resource type
			var resourceType string
			if strings.Contains(displayLower, "cpu cost)") {
				resourceType = "core"
			} else if strings.Contains(displayLower, "ram cost)") {
				resourceType = "ram"
			}

			if resourceType != "" {
				if price, hasPricing := pricing[sku.SkuId]; hasPricing {
					key := windowsLicenseType{
						resourceType: resourceType,
					}
					if len(windowsLicenses[key]) > 0 {
						duplicatePriceKeys++
					}
					// Store all candidate licenses and select later.
					windowsLicenses[key] = append(windowsLicenses[key], regionScoped(price))
					windowsSKUCount++
				}
			}
			continue // Don't process as instance SKU
		}

		// Capture committed-use discount (CUD) SKUs into dedicated buckets. All
		// carry a "Commitment[ v1]: ..." prefix and are intentionally never mixed
		// into on-demand/spot pricing. Done before the on-demand "instance" gate
		// (their display names have no "instance" token) and before the
		// commitment/discount taxonomy filter that drops them. Resource CUDs
		// ("... <family> Cpu/Ram in <region> for <1|3> Year") feed cudData;
		// Local SSD CUDs ("... [<family> ]Local SSD in <region> for <1|3> Year")
		// feed ssdCudData and are folded into bundled-SSD shapes' CUD price below.
		// The gate is "commitment" (not "commitment v") so the version-less C2
		// legacy form ("Commitment: Compute optimized Core running in ...") is
		// caught too; non-CUD "commitment" SKUs fall through to the final continue
		// exactly as they were dropped on the on-demand path before.
		if strings.Contains(displayLower, "commitment") {
			if cudFamily, cudResource, cudCommitTerm, isCUD := parseCUDSKU(sku); isCUD {
				price, hasPricing := pricing[sku.SkuId]
				if !hasPricing {
					continue
				}
				cudSKUCount++

				for _, targetRegion := range cudTargetRegions(sku) {
					key := cudKey{
						machineType:  cudFamily,
						region:       targetRegion,
						term:         cudCommitTerm,
						resourceType: cudResource,
					}
					cudData[key] = append(cudData[key], regionScoped(price))

					for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
						expandedKey := cudKey{
							machineType:  cudFamily,
							region:       expandedRegion,
							term:         cudCommitTerm,
							resourceType: cudResource,
						}
						cudData[expandedKey] = append(cudData[expandedKey], multiRegionFallback(price))
					}
				}
				continue
			}

			if ssdFamily, ssdTerm, isSSDCUD := parseLocalSSDCommitmentSKU(sku); isSSDCUD {
				price, hasPricing := pricing[sku.SkuId]
				if !hasPricing {
					continue
				}
				ssdCudSKUCount++

				for _, targetRegion := range cudTargetRegions(sku) {
					key := ssdCudKey{family: ssdFamily, region: targetRegion, term: ssdTerm}
					ssdCudData[key] = append(ssdCudData[key], regionScoped(price))

					for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
						expandedKey := ssdCudKey{family: ssdFamily, region: expandedRegion, term: ssdTerm}
						ssdCudData[expandedKey] = append(ssdCudData[expandedKey], multiRegionFallback(price))
					}
				}
				continue
			}

			continue
		}

		// Capture Local SSD usage SKUs into their own bucket. Handled before
		// the on-demand "instance" gate because the generic "SSD backed Local
		// Storage" SKUs carry no "instance" token, and the per-family
		// "<FAMILY> Instance Local SSD" SKUs would otherwise fail the
		// core/ram parse. Local SSD commitment SKUs never reach this point:
		// they contain "commitment" and are consumed by the CUD block above
		// (routed to ssdCudData), so only usage SKUs remain here.
		if ssdFamily, ssdSpot, isLocalSSD := parseLocalSSDSKU(sku); isLocalSSD {
			if !shouldUseLocalSSDSKUForPricing(sku, displayLower) {
				skippedByTaxonomyCount++
				continue
			}
			price, hasPricing := pricing[sku.SkuId]
			if !hasPricing {
				continue
			}
			localSSDSKUCount++

			targetRegions := targetRegionsForSKU(sku, skuRegion(sku))
			if len(targetRegions) == 0 {
				// The legacy generic SKUs ("SSD backed Local Storage" with no
				// region tail) are multi-regional with the region list only
				// in multiRegionalMetadata and no grouping keyword in the
				// display name for skuRegion to resolve.
				targetRegions = multiRegionalMetadataRegions(sku)
			}
			for _, targetRegion := range targetRegions {
				key := localSSDKey{family: ssdFamily, region: targetRegion, isSpot: ssdSpot}
				ssdData[key] = append(ssdData[key], regionScoped(price))

				// Keep multi-regional prices as fallback candidates for
				// specific regions, mirroring the core/ram handling.
				for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
					expandedKey := localSSDKey{family: ssdFamily, region: expandedRegion, isSpot: ssdSpot}
					ssdData[expandedKey] = append(ssdData[expandedKey], multiRegionFallback(price))
				}
			}
			continue
		}

		// Capture the Memory Optimized Upgrade Premium surcharge SKUs into their
		// own bucket. Done before the on-demand instance gate: the premium
		// display name contains "Memory-optimized Instance Core/Ram", which
		// parseMachineTypeFromSKU deliberately refuses to map to M1 (so the
		// surcharge never inflates M1's own rates), leaving it family-less and
		// otherwise dropped. Only on-demand premiums exist, so isSpot is false.
		if premiumResource, isPremium := parseMemoryOptimizedPremiumSKU(sku); isPremium {
			if !shouldUseSKUForPricing(sku, false, displayLower) {
				skippedByTaxonomyCount++
				continue
			}
			price, hasPricing := pricing[sku.SkuId]
			if !hasPricing {
				continue
			}
			memoryPremiumSKUCount++

			for _, targetRegion := range targetRegionsForSKU(sku, skuRegion(sku)) {
				key := premiumKey{region: targetRegion, resourceType: premiumResource}
				premiumData[key] = append(premiumData[key], regionScoped(price))

				for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
					expandedKey := premiumKey{region: expandedRegion, resourceType: premiumResource}
					premiumData[expandedKey] = append(premiumData[expandedKey], multiRegionFallback(price))
				}
			}
			continue
		}

		// Process both instance SKUs and Windows licensing SKUs. C2's legacy
		// SKUs ("Compute optimized Core/Ram running in ...") predate the
		// "<FAMILY> Instance Core/Ram" naming and carry no "instance" token,
		// so admit them explicitly.
		isInstanceSKU := strings.Contains(displayLower, "instance") ||
			legacySKURegex.MatchString(displayLower)
		isWindowsLicense := strings.Contains(displayLower, "licensing fee for windows")

		if !isInstanceSKU && !isWindowsLicense {
			continue
		}
		instanceSKUCount++

		if strings.Contains(displayLower, "custom") {
			// Skip custom machine types for now
			continue
		}

		machineFamily, resourceType, region, isSpot, isWindows := parseMachineTypeFromSKU(sku)
		if machineFamily == "" || resourceType == "" || region == "" {
			// Log failed parse for debugging
			if parsedSKUCount < 5 {
				log.Printf("Failed to parse SKU: family='%s', type='%s', region='%s', windows=%v from '%s'",
					machineFamily, resourceType, region, isWindows, sku.DisplayName)
			}
			continue
		}
		parsedSKUCount++

		if !shouldUseSKUForPricing(sku, isSpot, displayLower) {
			skippedByTaxonomyCount++
			continue
		}

		// Track Windows SKUs
		if isWindows {
			windowsSKUCount++
			// Log first few Windows SKUs for debugging
			if windowsSKUCount <= 3 {
				log.Printf("Found Windows SKU: %s", sku.DisplayName)
			}
		}

		// Only process core and ram resources
		if !strings.Contains(resourceType, "core") && !strings.Contains(resourceType, "ram") {
			continue
		}

		price, hasPricing := pricing[sku.SkuId]
		if !hasPricing {
			continue
		}
		pricedSKUCount++

		targetRegions := targetRegionsForSKU(sku, region)
		for _, targetRegion := range targetRegions {
			key := skuKey{
				machineType:  machineFamily,
				region:       targetRegion,
				isSpot:       isSpot,
				isWindows:    isWindows,
				resourceType: resourceType,
			}

			if len(skuData[key]) > 0 {
				duplicatePriceKeys++
			}
			skuData[key] = append(skuData[key], regionScoped(price))

			// Keep multi-regional prices as fallback candidates for specific regions.
			for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
				expandedKey := skuKey{
					machineType:  machineFamily,
					region:       expandedRegion,
					isSpot:       isSpot,
					isWindows:    isWindows,
					resourceType: resourceType,
				}
				if len(skuData[expandedKey]) > 0 {
					duplicatePriceKeys++
				}
				skuData[expandedKey] = append(skuData[expandedKey], multiRegionFallback(price))
			}
		}
	}

	log.Printf(
		"GCP SKU filtering: parsed=%d priced=%d skippedByTaxonomy=%d duplicateCandidateKeys=%d cudSKUs=%d ssdCudSKUs=%d localSSDSKUs=%d memoryPremiumSKUs=%d",
		parsedSKUCount,
		pricedSKUCount,
		skippedByTaxonomyCount,
		duplicatePriceKeys,
		cudSKUCount,
		ssdCudSKUCount,
		localSSDSKUCount,
		memoryPremiumSKUCount,
	)

	isSyntheticRegion := func(region string) bool {
		return strings.HasPrefix(region, "multi-")
	}

	// A family that prices Local SSD through its own SKUs in some regions but
	// not others is a catalog gap, not a family that uses the generic rate:
	// per-family Titanium SSD rates run about twice the generic "SSD backed
	// Local Storage" rate, so silently falling through understates the shape by
	// roughly half its SSD component. Families with no per-family SKU anywhere
	// (A2, A3, C3, C3D) genuinely bill at the generic rate and must not warn,
	// and neither must the families in bundledSSDBillsAtGenericRate, for which
	// the generic rate is the intended answer.
	familyHasOwnSSDSKU := make(map[string]bool)
	for key := range ssdData {
		if key.family != "" {
			familyHasOwnSSDSKU[key.family] = true
		}
	}
	for key := range ssdCudData {
		if key.family != "" {
			familyHasOwnSSDSKU[key.family] = true
		}
	}
	genericSSDFallbacks := make(map[string]bool)
	missingGenericSSDRates := make(map[string]bool)

	// noteSSDRateSource records the two ways resolving a bundled Local SSD rate
	// can land on a rate Google does not bill for that family, so the scrape
	// reports them once at the end instead of per shape/region/term.
	noteSSDRateSource := func(family, region string, usedGeneric bool) {
		if isSyntheticRegion(region) {
			return
		}
		switch {
		case usedGeneric && familyHasOwnSSDSKU[family] && !bundledSSDBillsAtGenericRate[family]:
			genericSSDFallbacks[fmt.Sprintf("%s/%s", family, region)] = true
		case !usedGeneric && bundledSSDBillsAtGenericRate[family]:
			missingGenericSSDRates[fmt.Sprintf("%s/%s", family, region)] = true
		}
	}

	// localSSDRate resolves the per GiB-hour Local SSD rate for a machine
	// family in a region, following ssdFamilyPrecedence.
	localSSDRate := func(family, region string, isSpot bool) (float64, bool) {
		for _, candidateFamily := range ssdFamilyPrecedence(family) {
			candidates, ok := ssdData[localSSDKey{family: candidateFamily, region: region, isSpot: isSpot}]
			if !ok {
				continue
			}
			if rate, hasRate := selectHourlyPrice(candidates); hasRate {
				noteSSDRateSource(family, region, candidateFamily == "")
				return rate, true
			}
		}
		return 0, false
	}

	// ssdCudRate resolves the per GiB-hour Local SSD committed-use rate for a
	// machine family in a region and term. Per-family commitment SKUs take
	// precedence over the generic "Commitment v1: Local SSD" SKUs, matching the
	// on-demand localSSDRate precedence.
	ssdCudRate := func(family, region, term string) (float64, bool) {
		for _, candidateFamily := range ssdFamilyPrecedence(family) {
			candidates, ok := ssdCudData[ssdCudKey{family: candidateFamily, region: region, term: term}]
			if !ok {
				continue
			}
			if rate, hasRate := selectHourlyPrice(candidates); hasRate {
				noteSSDRateSource(family, region, candidateFamily == "")
				return rate, true
			}
		}
		return 0, false
	}

	// A bundled Local SSD shape whose region has neither a per-family nor a
	// generic Local SSD rate falls back to a core+RAM-only price, which is the
	// exact bug the SSD fold-in exists to fix. Collect the misses and report
	// them once at the end rather than per shape/region/term, which would be
	// thousands of Slack warnings.
	//
	// The synthetic multi-region keys are excluded. Per-family Local SSD SKUs
	// ("C4D Instance Local SSD running in Americas") are TYPE_MULTI_REGIONAL
	// and do resolve to them, but the legacy generic "SSD backed Local Storage"
	// SKUs carry their region list in multiRegionalMetadata, which expands only
	// to member regions and never to the group key. Families with no per-family
	// SSD SKU (A2, A3, C3, C3D) therefore have no rate at a group key and would
	// report a miss on every scrape, drowning out a real per-region gap.
	missingSSDRates := make(map[string]bool)
	missingSSDCudRates := make(map[string]bool)

	// premiumRate resolves the per-hour Memory Optimized Upgrade Premium rate
	// for a resource in a region, used to synthesize M2 on-demand pricing.
	premiumRate := func(region, resourceType string) (float64, bool) {
		candidates, ok := premiumData[premiumKey{region: region, resourceType: resourceType}]
		if !ok {
			return 0, false
		}
		return selectHourlyPrice(candidates)
	}

	// Build instances from machine specs
	matchedInstances := 0
	for instanceType, specs := range machineSpecs {
		// Determine GPU model pointer
		var gpuModel *string
		if specs.GPUModel != "" {
			gpuModel = &specs.GPUModel
		}

		instance := &GCPInstance{
			InstanceType:       instanceType,
			Family:             specs.Family,
			VCPU:               specs.VCPU,
			Memory:             specs.MemoryGB,
			PrettyName:         createPrettyName(instanceType),
			NetworkPerformance: "Variable",
			Generation:         "current",
			GPU:                specs.GPU,
			GPUModel:           gpuModel,
			GPUMemory:          specs.GPUMemory,
			Pricing:            make(map[Region]map[OS]any),
			Regions:            make(map[string]string),
			AvailabilityZones:  make(map[string][]string),
			LocalSSD:           specs.LocalSSDGB > 0,
			LocalSSDSize:       specs.LocalSSDGB,
			SharedCPU:          specs.IsSharedCPU,
			ComputeOptimized:   strings.Contains(specs.Family, "Compute optimized"),
			MemoryOptimized:    strings.Contains(specs.Family, "Memory optimized"),
		}

		// Add pricing data for each region
		// Extract machine family from instance type (e.g., "n2" from "n2-standard-4")
		machineFamily := strings.ToUpper(strings.Split(instanceType, "-")[0])

		// M2 machine types have no SKUs of their own: Google bills M2 as the M1
		// base core/RAM rates plus a per-region Memory Optimized Upgrade Premium
		// surcharge. Read M2's base rates from the M1 bucket and fold the premium
		// in below, for both on-demand and CUD.
		//
		// Committed-use discounts are family-scoped resource pools: M2's base
		// core/RAM usage draws down an M1 (memory-optimized) commitment, so M2's
		// CUD base rates come from the M1 commitment bucket. The Upgrade Premium
		// has no commitment variant in the catalog, so the premium keeps billing
		// at its on-demand rate on top of the discounted base -- M2 CUD is thus
		// the M1 commitment core/RAM rates plus the same on-demand premium used
		// for M2 on-demand. M2 Spot stays unset: there is no premium Spot SKU to
		// add to M1's spot rates.
		isM2 := machineFamily == "M2"
		baseFamily := machineFamily
		if isM2 {
			baseFamily = "M1"
		}

		// m4-ultramem-224 is the only M4 shape billed under its own dedicated
		// "M4Ultramem224 Instance Core/Ram" SKU pair (with matching Spot and
		// CUD variants of its own); every other M4 shape (megamem, hypermem,
		// ultramem-56/112) bills the plain M4 rates that machineFamily/baseFamily
		// already resolve to. Route both the on-demand/spot and CUD lookups to
		// its own bucket instead.
		cudFamily := machineFamily
		if instanceType == "m4-ultramem-224" {
			baseFamily = "M4ULTRAMEM224"
			cudFamily = "M4ULTRAMEM224"
		}

		// M2 draws its committed-use base rates from the M1 commitment bucket
		// (see the family-scoped resource-pool note above); the premium is added
		// on top per region in the CUD assembly loop.
		if isM2 {
			cudFamily = "M1"
		}

		// Group pricing by region, spot status, and OS
		type regionKey struct {
			region    string
			isSpot    bool
			isWindows bool
		}
		regionPricing := make(map[regionKey]struct {
			corePrice float64
			ramPrice  float64
			hasCores  bool
			hasRAM    bool
		})

		for key, candidates := range skuData {
			if key.machineType != baseFamily {
				continue
			}

			// M2 borrows only M1's on-demand rates; without a premium Spot SKU
			// its Spot price cannot be synthesized.
			if isM2 && key.isSpot {
				continue
			}

			hourlyPrice, hasPrice := selectHourlyPrice(candidates)
			if !hasPrice {
				continue
			}

			// Fold the M2 premium onto the M1 base rate. A region without a
			// premium rate for this resource yields no M2 price there.
			if isM2 {
				premium, hasPremium := premiumRate(key.region, key.resourceType)
				if !hasPremium {
					continue
				}
				hourlyPrice += premium
			}

			rk := regionKey{region: key.region, isSpot: key.isSpot, isWindows: key.isWindows}
			pricing := regionPricing[rk]

			switch key.resourceType {
			case "core":
				pricing.corePrice = hourlyPrice
				pricing.hasCores = true
			case "ram":
				pricing.ramPrice = hourlyPrice
				pricing.hasRAM = true
			}

			regionPricing[rk] = pricing
		}

		// Now calculate total instance pricing
		for rk, pricing := range regionPricing {
			// We need both cores and RAM pricing to calculate total
			if !pricing.hasCores || !pricing.hasRAM {
				continue
			}

			// Total price = (vCPUs * core price) + (memory GB * RAM price)
			totalPrice := (float64(specs.VCPU) * pricing.corePrice) + (specs.MemoryGB * pricing.ramPrice)

			// Machine types with bundled Local SSD are billed for that
			// capacity on top of the core/RAM rates, so fold it into the
			// shape's price. Without this a c3-standard-8-lssd shows the same
			// price as a c3-standard-8 even though Google bills the bundled
			// Titanium SSD. Shapes where Local SSD is an optional attachment
			// have LocalSSDGB == 0 and are unaffected.
			if specs.LocalSSDGB > 0 {
				if ssdRate, hasSSDRate := localSSDRate(machineFamily, rk.region, rk.isSpot); hasSSDRate {
					totalPrice += float64(specs.LocalSSDGB) * ssdRate
				} else if !isSyntheticRegion(rk.region) {
					missingSSDRates[fmt.Sprintf("%s/%s/spot=%v", machineFamily, rk.region, rk.isSpot)] = true
				}
			}

			if totalPrice == 0 {
				continue
			}

			// Initialize region pricing if needed
			if _, exists := instance.Pricing[rk.region]; !exists {
				instance.Pricing[rk.region] = make(map[OS]any)
			}

			// Set OS based on the pricing data
			os := "linux"
			if rk.isWindows {
				os = "windows"
			}

			var pricingData *GCPPricingData
			if existing, ok := instance.Pricing[rk.region][os].(*GCPPricingData); ok {
				pricingData = existing
			} else {
				pricingData = &GCPPricingData{}
				instance.Pricing[rk.region][os] = pricingData
			}

			// Set pricing based on whether it's spot or on-demand
			priceStr := formatPrice(totalPrice)
			if rk.isSpot {
				pricingData.Spot = priceStr
			} else {
				pricingData.OnDemand = priceStr
			}

			// Add region to the regions map
			if displayName, ok := regions[rk.region]; ok {
				instance.Regions[rk.region] = displayName
			} else {
				// Fallback to friendly name lookup for regions not in compute API
				instance.Regions[rk.region] = getRegionFriendlyName(rk.region)
			}
		}

		// Assemble committed use discount (CUD) pricing the same way on-demand is
		// built: per-region, per-term, total = core_rate*vCPU + ram_rate*RAM,
		// plus the bundled Local SSD commitment rate for shapes that have one.
		// CUDs apply to the Linux compute price (no OS license), so they attach
		// to the Linux pricing data.
		type cudRegionKey struct {
			region string
			term   string
		}
		cudRegionPricing := make(map[cudRegionKey]struct {
			corePrice float64
			ramPrice  float64
			hasCores  bool
			hasRAM    bool
		})

		for key, candidates := range cudData {
			if key.machineType != cudFamily {
				continue
			}

			// CUD list prices are baseline rates; use the standard list-price
			// selection (same as on-demand, not the spot-style minimum).
			hourlyPrice, hasPrice := selectHourlyPrice(candidates)
			if !hasPrice {
				continue
			}

			// M2 draws its CUD base rates from the M1 commitment bucket and, like
			// M2 on-demand, adds the on-demand Upgrade Premium (which has no
			// commitment variant). A region without a premium rate for this
			// resource yields no M2 CUD price there.
			if isM2 {
				premium, hasPremium := premiumRate(key.region, key.resourceType)
				if !hasPremium {
					continue
				}
				hourlyPrice += premium
			}

			crk := cudRegionKey{region: key.region, term: key.term}
			p := cudRegionPricing[crk]
			switch key.resourceType {
			case "core":
				p.corePrice = hourlyPrice
				p.hasCores = true
			case "ram":
				p.ramPrice = hourlyPrice
				p.hasRAM = true
			}
			cudRegionPricing[crk] = p
		}

		for crk, p := range cudRegionPricing {
			// Both core and RAM rates are required to assemble a price.
			if !p.hasCores || !p.hasRAM {
				continue
			}

			totalCUD := (float64(specs.VCPU) * p.corePrice) + (specs.MemoryGB * p.ramPrice)

			// Fold in the bundled Local SSD commitment rate, mirroring the
			// on-demand SSD fold-in, so a bundled-SSD shape's CUD price covers
			// its SSD too instead of core+RAM only. Shapes with no bundled SSD
			// have LocalSSDGB == 0 and are unaffected.
			if specs.LocalSSDGB > 0 {
				if ssdRate, hasSSDRate := ssdCudRate(machineFamily, crk.region, crk.term); hasSSDRate {
					totalCUD += float64(specs.LocalSSDGB) * ssdRate
				} else if !isSyntheticRegion(crk.region) {
					missingSSDCudRates[fmt.Sprintf("%s/%s/%s", machineFamily, crk.region, crk.term)] = true
				}
			}

			if totalCUD == 0 {
				continue
			}

			// Only attach CUD to regions that already have Linux on-demand
			// pricing; an instance with no baseline price in a region should not
			// surface a lone commitment rate.
			regionPricingMap, hasRegion := instance.Pricing[crk.region]
			if !hasRegion {
				continue
			}
			linuxPricing, ok := regionPricingMap["linux"].(*GCPPricingData)
			if !ok {
				continue
			}

			cudStr := formatPrice(totalCUD)
			switch crk.term {
			case cudTerm1Yr:
				linuxPricing.CUD1Yr = cudStr
			case cudTerm3Yr:
				linuxPricing.CUD3Yr = cudStr
			}
		}

		// Only include instances that have pricing data
		if len(instance.Pricing) > 0 {
			instances[instanceType] = instance
			matchedInstances++
		}
	}

	if len(missingSSDRates) > 0 {
		utils.SendWarning("GCP bundled Local SSD priced without its SSD, no Local SSD rate for family/region/spot:",
			strings.Join(slices.Sorted(maps.Keys(missingSSDRates)), " "))
	}
	if len(missingSSDCudRates) > 0 {
		utils.SendWarning("GCP bundled Local SSD CUD priced without its SSD, no Local SSD commitment rate for family/region/term:",
			strings.Join(slices.Sorted(maps.Keys(missingSSDCudRates)), " "))
	}
	if len(genericSSDFallbacks) > 0 {
		utils.SendWarning("GCP bundled Local SSD priced from the generic Local SSD rate, family has its own Local SSD SKUs elsewhere but not here (likely understated by about half the SSD component) for family/region:",
			strings.Join(slices.Sorted(maps.Keys(genericSSDFallbacks)), " "))
	}
	if len(missingGenericSSDRates) > 0 {
		utils.SendWarning("GCP bundled Local SSD priced from the per-family Local SSD rate, but this family bills at the generic rate and no generic rate exists in this region, for family/region:",
			strings.Join(slices.Sorted(maps.Keys(missingGenericSSDRates)), " "))
	}
	ambiguousRates := ambiguousRateKeys(skuData, func(key skuKey) string {
		term := "ondemand"
		if key.isSpot {
			term = "spot"
		}
		if key.isWindows {
			term += "+windows"
		}
		return fmt.Sprintf("%s/%s/%s/%s", key.machineType, key.region, key.resourceType, term)
	})
	ambiguousRates = append(ambiguousRates, ambiguousRateKeys(cudData, func(key cudKey) string {
		return fmt.Sprintf("%s/%s/%s/cud_%s", key.machineType, key.region, key.resourceType, key.term)
	})...)
	ambiguousRates = append(ambiguousRates, ambiguousRateKeys(premiumData, func(key premiumKey) string {
		return fmt.Sprintf("premium/%s/%s", key.region, key.resourceType)
	})...)
	if len(ambiguousRates) > 0 {
		utils.SendWarning("GCP two region-scoped SKUs disagree on price, the higher rate was selected (Google bills the lower twin for M1 asia-southeast1 on-demand core, so verify rather than assume) for family/region/resource/term:",
			strings.Join(slices.Sorted(slices.Values(ambiguousRates)), " "))
	}

	// Now add Windows pricing to all instances
	windowsInstanceCount := 0

	for _, instance := range instances {
		// Check if we have Windows license fees (global, not region-specific)
		coreKey := windowsLicenseType{resourceType: "core"}
		ramKey := windowsLicenseType{resourceType: "ram"}

		coreLicenseCandidates, hasCoreLicense := windowsLicenses[coreKey]
		ramLicenseCandidates, hasRamLicense := windowsLicenses[ramKey]

		if !hasCoreLicense {
			continue // At minimum need core pricing
		}

		// Calculate Windows license cost (same for all regions)
		coreLicensePrice, hasCorePrice := selectHourlyPrice(coreLicenseCandidates)
		ramLicensePrice := 0.0
		if hasRamLicense {
			if selectedRAM, hasRAMPrice := selectHourlyPrice(ramLicenseCandidates); hasRAMPrice {
				ramLicensePrice = selectedRAM
			}
		}

		if !hasCorePrice || coreLicensePrice == 0 {
			continue // Need at least core pricing
		}

		// Windows license = (vCPUs * core license) + (memory GB * RAM license)
		windowsLicenseCost := (float64(instance.VCPU) * coreLicensePrice) + (instance.Memory * ramLicensePrice)

		// For each region that has Linux pricing, add Windows pricing
		for region := range instance.Pricing {
			// Get Linux pricing to add Windows license on top
			if linuxPricing, ok := instance.Pricing[region]["linux"].(*GCPPricingData); ok {
				windowsPricing := &GCPPricingData{}

				// Add license cost to on-demand pricing
				if linuxPricing.OnDemand != "" {
					linuxOnDemand, _ := strconv.ParseFloat(linuxPricing.OnDemand, 64)
					windowsOnDemand := linuxOnDemand + windowsLicenseCost
					windowsPricing.OnDemand = formatPrice(windowsOnDemand)
				}

				// Add license cost to spot pricing (Windows spot includes license)
				if linuxPricing.Spot != "" {
					linuxSpot, _ := strconv.ParseFloat(linuxPricing.Spot, 64)
					windowsSpot := linuxSpot + windowsLicenseCost
					windowsPricing.Spot = formatPrice(windowsSpot)
				}

				// Store Windows pricing
				if windowsPricing.OnDemand != "" || windowsPricing.Spot != "" {
					instance.Pricing[region]["windows"] = windowsPricing
					windowsInstanceCount++
				}
			}
		}
	}

	log.Printf("Added Windows pricing to %d instance-region combinations", windowsInstanceCount)

	return instances
}

// Main scraping function
func DoGCPScraping() {
	log.Println("Fetching GCP regions from Compute Engine API...")
	regions, err := fetchRegions()
	if err != nil {
		log.Fatal("Failed to fetch regions:", err)
	}

	log.Println("Fetching GCP machine types from Compute Engine API...")
	machineSpecs, err := fetchMachineTypes()
	if err != nil {
		log.Fatal("Failed to fetch machine types:", err)
	}
	log.Printf("Fetched %d GCP machine types", len(machineSpecs))

	log.Println("Fetching GCP Compute Engine SKUs...")
	skus, err := fetchComputeSKUs()
	if err != nil {
		log.Fatal("Failed to fetch SKUs:", err)
	}
	log.Printf("Fetched %d GCP SKUs", len(skus))

	log.Println("Fetching GCP pricing data...")
	pricing, err := fetchPricing()
	if err != nil {
		log.Fatal("Failed to fetch pricing:", err)
	}
	log.Printf("Fetched pricing for %d GCP SKUs", len(pricing))

	log.Println("Processing GCP instance data...")
	instancesMap := processGCPData(skus, pricing, machineSpecs, regions)

	// Convert map to sorted slice
	instances := make([]*GCPInstance, 0, len(instancesMap))
	for _, instance := range instancesMap {
		instances = append(instances, instance)
	}

	// Sort by instance type
	sort.Slice(instances, func(i, j int) bool {
		return instances[i].InstanceType < instances[j].InstanceType
	})

	log.Printf("Processed %d unique GCP instance types", len(instances))

	// Save to file
	utils.SaveInstances(instances, "www/gcp/instances.json")
	log.Println("GCP scraping completed successfully!")
}
