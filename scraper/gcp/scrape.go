package gcp

import (
	"log"
	"os"
	"scraper/utils"
	"sort"
	"strconv"
	"strings"
)

// Process SKUs and pricing data to generate GCP instances
func processGCPData(skus []SKU, pricing map[string]PriceInfo) map[string]*GCPInstance {
	instances := make(map[string]*GCPInstance)

	// Group SKUs by machine type and region
	type skuKey struct {
		machineType  string
		region       string
		isSpot       bool
		isWindows    bool
		resourceType string
	}

	skuData := make(map[skuKey]PriceInfo)

	// Store Windows license fees separately (they're global, not region-specific)
	type windowsLicenseType struct {
		resourceType string // "core" or "ram"
	}
	windowsLicenses := make(map[windowsLicenseType]PriceInfo)

	// Debug counters
	instanceSKUCount := 0
	parsedSKUCount := 0
	pricedSKUCount := 0
	windowsSKUCount := 0

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
					// Store the license
					windowsLicenses[key] = price
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

		key := skuKey{
			machineType:  machineFamily,
			region:       region,
			isSpot:       isSpot,
			isWindows:    isWindows,
			resourceType: resourceType,
		}

		skuData[key] = price

		// If this is a multi-regional SKU, expand it to actual regions immediately
		if strings.HasPrefix(region, "multi-") {
			var targetRegions []string
			switch region {
			case "multi-americas":
				targetRegions = []string{"us-central1", "us-east1", "us-east4", "us-east5", "us-south1", "us-west1", "us-west2", "us-west3", "us-west4", "northamerica-northeast1", "northamerica-northeast2", "southamerica-east1", "southamerica-west1"}
			case "multi-europe":
				targetRegions = []string{"europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west6", "europe-west8", "europe-west9", "europe-north1", "europe-central2", "europe-southwest1"}
			case "multi-asia":
				targetRegions = []string{"asia-east1", "asia-east2", "asia-northeast1", "asia-northeast2", "asia-northeast3", "asia-south1", "asia-south2", "asia-southeast1", "asia-southeast2", "australia-southeast1", "australia-southeast2"}
			}

			// Copy the price to all target regions
			for _, targetRegion := range targetRegions {
				regionalKey := skuKey{
					machineType:  machineFamily,
					region:       targetRegion,
					isSpot:       isSpot,
					isWindows:    isWindows,
					resourceType: resourceType,
				}
				// Only add if not already present (regional pricing takes precedence)
				if _, exists := skuData[regionalKey]; !exists {
					skuData[regionalKey] = price
				}
			}
		}
	}

	// Build instances from machine specs
	matchedInstances := 0
	for instanceType, specs := range gcpMachineSpecs {
		instance := &GCPInstance{
			InstanceType:       instanceType,
			Family:             specs.family,
			VCPU:               specs.vcpu,
			Memory:             specs.memory,
			PrettyName:         createPrettyName(instanceType),
			NetworkPerformance: "Variable",
			Generation:         "current",
			GPU:                0,
			Pricing:            make(map[Region]map[OS]any),
			Regions:            make(map[string]string),
			AvailabilityZones:  make(map[string][]string),
			LocalSSD:           false,
			SharedCPU:          strings.HasPrefix(instanceType, "e2-") || strings.HasPrefix(instanceType, "f1-") || strings.HasPrefix(instanceType, "g1-"),
			ComputeOptimized:   strings.Contains(specs.family, "Compute optimized"),
			MemoryOptimized:    strings.Contains(specs.family, "Memory optimized"),
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

		for key, priceInfo := range skuData {
			if key.machineType != machineFamily {
				continue
			}

			// Calculate hourly price for this resource
			hourlyPrice := calculateHourlyPrice(priceInfo)
			if hourlyPrice == 0 {
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
			totalPrice := (float64(specs.vcpu) * pricing.corePrice) + (specs.memory * pricing.ramPrice)

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
			instance.Regions[rk.region] = getRegionDisplayName(rk.region)
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

		coreLicense, hasCoreLicense := windowsLicenses[coreKey]
		ramLicense, hasRamLicense := windowsLicenses[ramKey]

		if !hasCoreLicense {
			continue // At minimum need core pricing
		}

		// Calculate Windows license cost (same for all regions)
		coreLicensePrice := calculateHourlyPrice(coreLicense)
		ramLicensePrice := 0.0
		if hasRamLicense {
			ramLicensePrice = calculateHourlyPrice(ramLicense)
		}

		if coreLicensePrice == 0 {
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
	apiKey := os.Getenv("GCP_API_KEY")

	log.Println("Fetching GCP Compute Engine SKUs...")
	skus, err := fetchComputeSKUs(apiKey)
	if err != nil {
		log.Fatal("Failed to fetch SKUs:", err)
	}
	log.Printf("Fetched %d GCP SKUs", len(skus))

	log.Println("Fetching GCP pricing data...")
	pricing, err := fetchPricing(apiKey)
	if err != nil {
		log.Fatal("Failed to fetch pricing:", err)
	}
	log.Printf("Fetched pricing for %d GCP SKUs", len(pricing))

	log.Println("Processing GCP instance data...")
	instancesMap := processGCPData(skus, pricing)

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
