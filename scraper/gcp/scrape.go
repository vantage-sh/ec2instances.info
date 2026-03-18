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
		"GCP SKU filtering: parsed=%d priced=%d skippedByTaxonomy=%d duplicateCandidateKeys=%d",
		parsedSKUCount,
		pricedSKUCount,
		skippedByTaxonomyCount,
		duplicatePriceKeys,
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
			Pricing:            make(map[Region]map[OS]any),
			Regions:            make(map[string]string),
			AvailabilityZones:  make(map[string][]string),
			LocalSSD:           false,
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
