package gcp

import (
	"fmt"
	"log"
	"os"
	"regexp"
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
	Type             string            `json:"type"`
	RegionalMetadata *RegionalMetadata `json:"regionalMetadata,omitempty"`
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
	Value string `json:"value,omitempty"`
	Nanos int64  `json:"nanos,omitempty"`
}

type UnitInfo struct {
	Unit            string `json:"unit"`
	UnitDescription string `json:"unitDescription"`
}

type PricesResponse struct {
	Prices        []PriceInfo `json:"prices"`
	NextPageToken string      `json:"nextPageToken"`
}

// Machine type structures from Compute Engine API
type MachineType struct {
	Name                         string       `json:"name"`
	Description                  string       `json:"description"`
	GuestCpus                    int          `json:"guestCpus"`
	MemoryMb                     int          `json:"memoryMb"`
	IsSharedCpu                  bool         `json:"isSharedCpu"`
	Zone                         string       `json:"zone"`
	MaximumPersistentDisks       int          `json:"maximumPersistentDisks"`
	MaximumPersistentDisksSizeGb string       `json:"maximumPersistentDisksSizeGb"`
	Accelerators                 []Accelerator `json:"accelerators,omitempty"`
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
	VCPU         int
	MemoryGB     float64
	Family       string
	IsSharedCPU  bool
	GPU          int
	GPUModel     string
	Zones        []string
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
			// Extract SKU ID from the price name (format: "skus/SKUID/price")
			parts := strings.Split(price.Name, "/")
			if len(parts) >= 2 {
				skuID := parts[1]
				priceMap[skuID] = price
			}
		}

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
		log.Printf("Fetched %d GCP prices so far...", len(priceMap))
	}

	return priceMap, nil
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
					}

					// Handle GPUs/accelerators
					if len(mt.Accelerators) > 0 {
						specs.GPU = mt.Accelerators[0].GuestAcceleratorCount
						specs.GPUModel = mt.Accelerators[0].GuestAcceleratorType
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
	// Memory optimized
	case strings.Contains(nameLower, "highmem"),
		strings.Contains(nameLower, "megamem"),
		strings.Contains(nameLower, "ultramem"),
		strings.HasPrefix(nameLower, "m1-"),
		strings.HasPrefix(nameLower, "m2-"),
		strings.HasPrefix(nameLower, "m3-"),
		strings.HasPrefix(nameLower, "m4-"),
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
		strings.HasPrefix(nameLower, "h3-"):
		// c4-highmem and similar should be memory optimized
		if strings.Contains(nameLower, "highmem") {
			return "Memory optimized"
		}
		return "Compute optimized"

	// Accelerator optimized (GPU)
	case strings.HasPrefix(nameLower, "a2-"),
		strings.HasPrefix(nameLower, "a3-"),
		strings.HasPrefix(nameLower, "g2-"):
		return "Accelerator optimized"

	// Storage optimized
	case strings.HasPrefix(nameLower, "z3-"):
		return "Storage optimized"

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
var machineTypeRegex = regexp.MustCompile(`(?i)(n1|n2d|n2|e2|e2a|c2|c2d|m1|m2|m3|m4|t2d|t2a|a2|a3|g2|h3|c3|c3d|z3|c4|n4).*(?:instance\s+(core|ram)|\((?:cpu|ram)\s+cost\))`)

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

	// Get region from geo taxonomy - fix the condition
	if sku.GeoTaxonomy.RegionalMetadata != nil {
		region = sku.GeoTaxonomy.RegionalMetadata.Region.Region
	} else if sku.GeoTaxonomy.Type == "TYPE_MULTI_REGIONAL" {
		// Use multi-regional as a special "region" identifier
		// Extract the location from display name (e.g., "running in Americas")
		displayLower := strings.ToLower(displayName)
		if strings.Contains(displayLower, "americas") {
			region = "multi-americas"
		} else if strings.Contains(displayLower, "europe") {
			region = "multi-europe"
		} else if strings.Contains(displayLower, "asia") {
			region = "multi-asia"
		}
	}

	return
}

// Calculate hourly price from GCP pricing tier
func calculateHourlyPrice(price PriceInfo) float64 {
	if price.ValueType != "rate" || len(price.Rate.Tiers) == 0 {
		return 0
	}

	tier := price.Rate.Tiers[0]

	// Convert to dollars - check both Value (string) and Nanos fields
	var dollars float64
	if tier.ListPrice.Value != "" {
		// Parse the value string
		if parsed, err := strconv.ParseFloat(tier.ListPrice.Value, 64); err == nil {
			dollars = parsed
		}
	} else {
		// Convert nanos to dollars
		dollars = float64(tier.ListPrice.Nanos) / 1e9
	}

	// GCP pricing is often per hour, but check the unit
	unit := strings.ToLower(price.Rate.Unit.Unit)
	if strings.Contains(unit, "month") || strings.Contains(unit, "mo") {
		// Convert monthly to hourly (assuming 730 hours per month)
		dollars = dollars / 730
	}

	return dollars
}

// Region name mapping
var gcpRegionNames = map[string]string{
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
	"australia-southeast1":    "Sydney",
	"australia-southeast2":    "Melbourne",
	"me-central1":             "Doha",
	"me-central2":             "Dammam",
	"me-west1":                "Tel Aviv",
	"africa-south1":           "Johannesburg",
}

func getRegionDisplayName(region string) string {
	if name, ok := gcpRegionNames[region]; ok {
		return name
	}
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
