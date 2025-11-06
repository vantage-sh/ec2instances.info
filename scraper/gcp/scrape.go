package gcp

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
)

// Process SKUs and pricing data to generate GCP instances
func processGCPData(skus []SKU, pricing map[string]PriceInfo) map[string]*GCPInstance {
	instances := make(map[string]*GCPInstance)

	// Group SKUs by machine type and region
	type skuKey struct {
		machineType string
		region      string
		isSpot      bool
		resourceType string
	}
	
	skuData := make(map[skuKey]PriceInfo)
	
	// Debug counters
	instanceSKUCount := 0
	parsedSKUCount := 0
	pricedSKUCount := 0

	for _, sku := range skus {
		// Only process compute instance SKUs (cores and RAM)
		if !strings.Contains(strings.ToLower(sku.DisplayName), "instance") {
			continue
		}
		instanceSKUCount++

		if strings.Contains(strings.ToLower(sku.DisplayName), "custom") {
			// Skip custom machine types for now
			continue
		}

		machineFamily, resourceType, region, isSpot := parseMachineTypeFromSKU(sku)
		if machineFamily == "" || resourceType == "" || region == "" {
			// Log failed parse for debugging
			if parsedSKUCount < 5 {
				log.Printf("Failed to parse SKU: family='%s', type='%s', region='%s' from '%s'", 
					machineFamily, resourceType, region, sku.DisplayName)
			}
			continue
		}
		parsedSKUCount++

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
			resourceType: resourceType,
		}
		
		skuData[key] = price
	}
	
	log.Printf("Debug: Found %d instance SKUs, parsed %d, priced %d, total keys %d", 
		instanceSKUCount, parsedSKUCount, pricedSKUCount, len(skuData))

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
		
		// Group pricing by region and spot status
		type regionKey struct {
			region string
			isSpot bool
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

			rk := regionKey{region: key.region, isSpot: key.isSpot}
			pricing := regionPricing[rk]
			
			if key.resourceType == "core" {
				pricing.corePrice = hourlyPrice
				pricing.hasCores = true
			} else if key.resourceType == "ram" {
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

			// For simplicity, we'll just store Linux pricing
			os := "linux"
			
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
	
	log.Printf("Debug: Checked %d predefined machine types, matched %d with pricing", 
		len(gcpMachineSpecs), matchedInstances)

	return instances
}

// Save instances to JSON file
func saveInstances(instances []*GCPInstance, filename string) error {
	data, err := json.MarshalIndent(instances, "", " ")
	if err != nil {
		return fmt.Errorf("failed to marshal instances: %w", err)
	}

	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	log.Printf("Saved %d GCP instances to %s", len(instances), filename)
	return nil
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
	if err := saveInstances(instances, "www/gcp/instances.json"); err != nil {
		log.Fatal("Failed to save instances:", err)
	}

	log.Println("GCP scraping completed successfully!")
}
