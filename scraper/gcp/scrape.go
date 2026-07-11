package gcp

import (
	"log"
	"scraper/utils"
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

func selectHourlyPrice(candidates []PriceInfo, preferLower bool) (float64, bool) {
	var selected float64
	hasValue := false

	for _, candidate := range candidates {
		hourlyPrice := calculateHourlyPrice(candidate)
		if hourlyPrice <= 0 {
			continue
		}

		if !hasValue {
			selected = hourlyPrice
			hasValue = true
			continue
		}

		if preferLower {
			if hourlyPrice < selected {
				selected = hourlyPrice
			}
			continue
		}

		if hourlyPrice > selected {
			selected = hourlyPrice
		}
	}

	return selected, hasValue
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

	skuData := make(map[skuKey][]PriceInfo)

	// Resource-based committed use discount (CUD) pricing, kept entirely separate
	// from on-demand/spot so commitment rates never bleed into baseline pricing.
	type cudKey struct {
		machineType  string
		region       string
		term         string // cudTerm1Yr or cudTerm3Yr
		resourceType string // "core" or "ram"
	}
	cudData := make(map[cudKey][]PriceInfo)
	cudSKUCount := 0

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
	ssdData := make(map[localSSDKey][]PriceInfo)
	localSSDSKUCount := 0

	// Memory Optimized Upgrade Premium pricing, keyed by region and resource
	// ("core"/"ram"). M2 has no SKUs of its own; Google bills it as the M1 base
	// core/RAM rates plus this per-region surcharge, so these rates are folded
	// into synthesized M2 on-demand pricing below.
	type premiumKey struct {
		region       string
		resourceType string
	}
	premiumData := make(map[premiumKey][]PriceInfo)
	memoryPremiumSKUCount := 0

	// Store Windows license fees separately (they're global, not region-specific)
	type windowsLicenseType struct {
		resourceType string // "core" or "ram"
	}
	windowsLicenses := make(map[windowsLicenseType][]PriceInfo)

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
					windowsLicenses[key] = append(windowsLicenses[key], price)
					windowsSKUCount++
				}
			}
			continue // Don't process as instance SKU
		}

		// Capture resource-based committed use discount (CUD) SKUs into a
		// dedicated bucket. These use the "Commitment v1: <family> Cpu/Ram in
		// <region> for <1|3> Year" naming and are intentionally never mixed into
		// on-demand/spot pricing. Done before the on-demand "instance" gate
		// (their display name has no "instance" token) and before the
		// commitment/discount taxonomy filter that drops them.
		if strings.Contains(displayLower, "commitment v") {
			cudFamily, cudResource, cudCommitTerm, isCUD := parseCUDSKU(sku)
			if !isCUD {
				continue
			}

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
				cudData[key] = append(cudData[key], price)

				for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
					expandedKey := cudKey{
						machineType:  cudFamily,
						region:       expandedRegion,
						term:         cudCommitTerm,
						resourceType: cudResource,
					}
					cudData[expandedKey] = append(cudData[expandedKey], price)
				}
			}
			continue
		}

		// Capture Local SSD usage SKUs into their own bucket. Handled before
		// the on-demand "instance" gate because the generic "SSD backed Local
		// Storage" SKUs carry no "instance" token, and the per-family
		// "<FAMILY> Instance Local SSD" SKUs would otherwise fail the
		// core/ram parse. Local SSD commitment SKUs never reach this point:
		// they contain "commitment v" and are consumed (and dropped) above.
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
				ssdData[key] = append(ssdData[key], price)

				// Keep multi-regional prices as fallback candidates for
				// specific regions, mirroring the core/ram handling.
				for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
					expandedKey := localSSDKey{family: ssdFamily, region: expandedRegion, isSpot: ssdSpot}
					ssdData[expandedKey] = append(ssdData[expandedKey], price)
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
				premiumData[key] = append(premiumData[key], price)

				for _, expandedRegion := range expandedRegionsForMultiRegion(targetRegion) {
					expandedKey := premiumKey{region: expandedRegion, resourceType: premiumResource}
					premiumData[expandedKey] = append(premiumData[expandedKey], price)
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
			skuData[key] = append(skuData[key], price)

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
				skuData[expandedKey] = append(skuData[expandedKey], price)
			}
		}
	}

	log.Printf(
		"GCP SKU filtering: parsed=%d priced=%d skippedByTaxonomy=%d duplicateCandidateKeys=%d cudSKUs=%d localSSDSKUs=%d memoryPremiumSKUs=%d",
		parsedSKUCount,
		pricedSKUCount,
		skippedByTaxonomyCount,
		duplicatePriceKeys,
		cudSKUCount,
		localSSDSKUCount,
		memoryPremiumSKUCount,
	)

	// localSSDRate resolves the per GiB-hour Local SSD rate for a machine
	// family in a region. Per-family SKUs take precedence over the generic
	// "SSD backed Local Storage" SKUs.
	localSSDRate := func(family, region string, isSpot bool) (float64, bool) {
		for _, candidateFamily := range []string{family, ""} {
			candidates, ok := ssdData[localSSDKey{family: candidateFamily, region: region, isSpot: isSpot}]
			if !ok {
				continue
			}
			if rate, hasRate := selectHourlyPrice(candidates, isSpot); hasRate {
				return rate, true
			}
		}
		return 0, false
	}

	// premiumRate resolves the per-hour Memory Optimized Upgrade Premium rate
	// for a resource in a region, used to synthesize M2 on-demand pricing.
	premiumRate := func(region, resourceType string) (float64, bool) {
		candidates, ok := premiumData[premiumKey{region: region, resourceType: resourceType}]
		if !ok {
			return 0, false
		}
		return selectHourlyPrice(candidates, false)
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
			GPU:                float64(specs.GPU),
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
		// surcharge. Read M2's base rates from the M1 bucket and fold the
		// premium in below. Only on-demand is synthesized -- the catalog has no
		// premium Spot or committed-use SKU, so M2 Spot and CUD prices are
		// intentionally left unset (a known limitation, like the Local SSD
		// commitment exclusion above).
		isM2 := machineFamily == "M2"
		baseFamily := machineFamily
		if isM2 {
			baseFamily = "M1"
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

			// Select hourly price from all candidates for this SKU key.
			// Spot should prefer lower prices; on-demand should prefer baseline list prices.
			hourlyPrice, hasPrice := selectHourlyPrice(candidates, key.isSpot)
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

		// Assemble resource-based committed use discount (CUD) pricing the same
		// way on-demand is built: per-region, per-term, total =
		// core_rate*vCPU + ram_rate*RAM. CUDs apply to the Linux compute price
		// (no OS license), so they attach to the Linux pricing data.
		//
		// Known simplification: Local SSD commitment SKUs ("Commitment v1:
		// Local SSD in ..." / "Commitment v1: <FAMILY> Local SSD in ...") are
		// not folded in, so CUD prices for bundled-Local-SSD shapes cover
		// core+RAM only while their on-demand/spot prices include the SSD.
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
			if key.machineType != machineFamily {
				continue
			}

			// CUD list prices are baseline rates; use the standard list-price
			// selection (same as on-demand, not the spot-style minimum).
			hourlyPrice, hasPrice := selectHourlyPrice(candidates, false)
			if !hasPrice {
				continue
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
		coreLicensePrice, hasCorePrice := selectHourlyPrice(coreLicenseCandidates, false)
		ramLicensePrice := 0.0
		if hasRamLicense {
			if selectedRAM, hasRAMPrice := selectHourlyPrice(ramLicenseCandidates, false); hasRAMPrice {
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
