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

// extractLocalSSDPricing scans SKUs for local SSD per-GB-month rates and
// returns a map of region -> platform -> USD per GB-month. Both on-demand
// and preemptible/spot rates are surfaced under platform keys "ondemand" and
// "spot". Hourly SKUs (GiBy.h) are converted to GB-month using a 730 hour
// month. Windows-licensed SKUs are skipped (local SSD has no OS variants).
func extractLocalSSDPricing(skus []SKU, pricing map[string]PriceInfo) map[string]map[string]float64 {
	out := make(map[string]map[string]float64)

	for _, sku := range skus {
		displayLower := strings.ToLower(sku.DisplayName)

		// Local SSD SKUs have "ssd" and either "local" or "scratch" in their
		// display name or taxonomy. Filter out unrelated storage SKUs
		// (persistent disks, snapshots, image storage, etc.).
		taxonomy := taxonomyValues(sku)
		isLocalSSDByName := strings.Contains(displayLower, "ssd") &&
			(strings.Contains(displayLower, "local") || strings.Contains(displayLower, "scratch"))
		isLocalSSDByTax := taxonomyContainsAny(taxonomy, "localssd", "local ssd", "local-ssd")

		if !isLocalSSDByName && !isLocalSSDByTax {
			continue
		}

		// Skip non-storage SKUs that may match the loose name filter.
		if strings.Contains(displayLower, "snapshot") ||
			strings.Contains(displayLower, "image") ||
			strings.Contains(displayLower, "persistent") {
			continue
		}

		// Skip Windows-licensed SKUs (local SSD has no OS variants).
		if strings.Contains(displayLower, "windows") {
			continue
		}

		// Skip commitment/discount SKUs.
		if strings.Contains(displayLower, "commit") ||
			strings.Contains(displayLower, "cud") ||
			strings.Contains(displayLower, "sustained") ||
			strings.Contains(displayLower, "reservation") ||
			strings.Contains(displayLower, "reserved") ||
			strings.Contains(displayLower, "saving") {
			continue
		}

		isSpot := strings.Contains(displayLower, "preemptible") || strings.Contains(displayLower, "spot")

		price, hasPrice := pricing[sku.SkuId]
		if !hasPrice {
			continue
		}

		// Convert tier-0 list price to USD per GB-month.
		// calculateHourlyPrice handles unit normalization for hourly/monthly
		// units. For storage rates (GiBy.h or GiBy.mo), we want GB-month, so
		// we re-compute here without the hourly conversion.
		gbMonth, ok := localSSDGBMonth(price)
		if !ok || gbMonth <= 0 {
			continue
		}

		platform := "ondemand"
		if isSpot {
			platform = "spot"
		}

		targetRegions := targetRegionsForSKU(sku, "")
		// Expand multi-regional SKUs to their constituent regions.
		expanded := make([]string, 0, len(targetRegions))
		for _, r := range targetRegions {
			expanded = append(expanded, r)
			expanded = append(expanded, expandedRegionsForMultiRegion(r)...)
		}

		for _, region := range expanded {
			if region == "" || strings.HasPrefix(region, "multi-") {
				continue
			}
			if out[region] == nil {
				out[region] = make(map[string]float64)
			}
			// If multiple SKUs report the same platform for a region, keep
			// the first non-zero value seen (subsequent SKUs are typically
			// region-specific overrides of multi-regional fallbacks).
			if _, exists := out[region][platform]; !exists {
				out[region][platform] = gbMonth
			}
		}
	}

	return out
}

// localSSDGBMonth returns USD per GB-month for a local SSD price record.
// Returns false if the unit is not understood.
func localSSDGBMonth(price PriceInfo) (float64, bool) {
	if strings.ToLower(price.ValueType) != "rate" || len(price.Rate.Tiers) == 0 {
		return 0, false
	}
	tier := price.Rate.Tiers[0]
	firstTierStart, ok := moneyToFloat(tier.StartAmount)
	if !ok || firstTierStart != 0 {
		return 0, false
	}
	dollars, ok := moneyToFloat(tier.ListPrice)
	if !ok {
		return 0, false
	}
	unitQuantity := normalizedUnitQuantity(price.Rate.Unit.UnitQuantity)
	if unitQuantity > 0 {
		dollars = dollars / unitQuantity
	}

	unit := strings.ToLower(strings.TrimSpace(price.Rate.Unit.Unit))
	switch classifyGCPPriceUnit(unit) {
	case "hourly":
		// Convert per-GB-hour to per-GB-month (730 h/mo).
		return dollars * 730, true
	case "monthly":
		return dollars, true
	default:
		return 0, false
	}
}

// localSSDBundledGB returns the number of GB of local SSD bundled with a
// machine type. For most GCP machine types this is 0 (local SSD is opt-in,
// attached in 375 GB increments by the user). Legacy *-lssd variants (e.g.
// "n1-standard-1-lssd") have mandatory bundled local SSDs; we don't have a
// reliable count from the API for those so we conservatively return 0.
// TODO: parse bundled disk counts from machine-type metadata if needed.
func localSSDBundledGB(instanceType string) int {
	return 0
}

// machineTypeSupportsLocalSSD reports whether attaching local SSD is
// available for this machine type. The conservative default is true for all
// standard predefined machine types (most GCP families allow attaching at
// least one local SSD); shared-core/micro/small variants and a small set of
// families do not. The cost surface is what matters here: if no local SSD
// pricing is available for any region, callers will emit empty regions.
func machineTypeSupportsLocalSSD(instanceType string, specs *MachineSpecs) bool {
	if specs == nil {
		return false
	}
	if specs.IsSharedCPU {
		return false
	}
	return true
}

// Process SKUs and pricing data to generate GCP instances
func processGCPData(skus []SKU, pricing map[string]PriceInfo, machineSpecs map[string]*MachineSpecs, regions map[string]string) map[string]*GCPInstance {
	instances := make(map[string]*GCPInstance)

	// Pre-compute local SSD pricing per region/platform (shared by all
	// instances since GCP charges a single per-GB-month rate per region for
	// local SSD, independent of machine type).
	localSSDPricing := extractLocalSSDPricing(skus, pricing)

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

		// Process both instance SKUs and Windows licensing SKUs
		isInstanceSKU := strings.Contains(displayLower, "instance")
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
		"GCP SKU filtering: parsed=%d priced=%d skippedByTaxonomy=%d duplicateCandidateKeys=%d cudSKUs=%d",
		parsedSKUCount,
		pricedSKUCount,
		skippedByTaxonomyCount,
		duplicatePriceKeys,
		cudSKUCount,
	)

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
			LocalSSD:           machineTypeSupportsLocalSSD(instanceType, specs),
			LocalSSDSize:       localSSDBundledGB(instanceType),
			SharedCPU:          specs.IsSharedCPU,
			ComputeOptimized:   strings.Contains(specs.Family, "Compute optimized"),
			MemoryOptimized:    strings.Contains(specs.Family, "Memory optimized"),
		}

		// Add pricing data for each region
		// Extract machine family from instance type (e.g., "n2" from "n2-standard-4")
		machineFamily := strings.ToUpper(strings.Split(instanceType, "-")[0])

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
			if key.machineType != machineFamily {
				continue
			}

			// Select hourly price from all candidates for this SKU key.
			// Spot should prefer lower prices; on-demand should prefer baseline list prices.
			hourlyPrice, hasPrice := selectHourlyPrice(candidates, key.isSpot)
			if !hasPrice {
				continue
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

	// Populate CostPerGb for every instance.
	//
	// Local SSD pricing is region/platform-scoped but not machine-type
	// scoped on GCP (a single per-GB-month rate applies across machine
	// types in a given region). For instances that support attaching local
	// SSD, attach the per-region rate map; for instances that don't,
	// emit baseline-only with empty regions. Always emit the field.
	for _, instance := range instances {
		baseline := float64(instance.LocalSSDSize)
		regionMap := make(map[string]any)

		if instance.LocalSSD {
			for region, platforms := range localSSDPricing {
				// Only surface regions where this instance is actually
				// available (has compute pricing).
				if _, ok := instance.Pricing[region]; !ok {
					continue
				}
				if len(platforms) == 0 {
					continue
				}
				regionMap[region] = collapseUniform(platforms)
			}
		}

		instance.CostPerGb = &CostPerGb{
			Baseline: baseline,
			Regions:  regionMap,
		}
	}

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
