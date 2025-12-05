package gcp

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

const (
	GCP_BILLING_API_BASE = "https://cloudbilling.googleapis.com"
	COMPUTE_SERVICE_ID   = "6F81-5844-456A" // Compute Engine service ID
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

// Helper function to make API requests with API key
func makeGCPRequest(url string, apiKey string, result interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	q := req.URL.Query()
	q.Add("key", apiKey)
	req.URL.RawQuery = q.Encode()

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API request failed with status: %d", resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(result)
}

// Fetch all SKUs for Compute Engine with pagination
func fetchComputeSKUs(apiKey string) ([]SKU, error) {
	var allSKUs []SKU
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/v2beta/skus?pageSize=5000&filter=service=\"services/%s\"", GCP_BILLING_API_BASE, COMPUTE_SERVICE_ID)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response SKUsResponse
		if err := makeGCPRequest(url, apiKey, &response); err != nil {
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
func fetchPricing(apiKey string) (map[string]PriceInfo, error) {
	priceMap := make(map[string]PriceInfo)
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/v1beta/skus/-/prices?pageSize=5000", GCP_BILLING_API_BASE)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response PricesResponse
		if err := makeGCPRequest(url, apiKey, &response); err != nil {
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

// Parse instance specifications from GCP machine type definitions
// This is a simplified mapping - in production you'd want to fetch this from GCP API
var gcpMachineSpecs = map[string]struct {
	vcpu   int
	memory float64
	family string
}{
	// N1 Standard
	"n1-standard-1":  {1, 3.75, "General purpose"},
	"n1-standard-2":  {2, 7.5, "General purpose"},
	"n1-standard-4":  {4, 15, "General purpose"},
	"n1-standard-8":  {8, 30, "General purpose"},
	"n1-standard-16": {16, 60, "General purpose"},
	"n1-standard-32": {32, 120, "General purpose"},
	"n1-standard-64": {64, 240, "General purpose"},
	"n1-standard-96": {96, 360, "General purpose"},

	// N1 High Memory
	"n1-highmem-2":  {2, 13, "Memory optimized"},
	"n1-highmem-4":  {4, 26, "Memory optimized"},
	"n1-highmem-8":  {8, 52, "Memory optimized"},
	"n1-highmem-16": {16, 104, "Memory optimized"},
	"n1-highmem-32": {32, 208, "Memory optimized"},
	"n1-highmem-64": {64, 416, "Memory optimized"},
	"n1-highmem-96": {96, 624, "Memory optimized"},

	// N1 High CPU
	"n1-highcpu-2":  {2, 1.8, "Compute optimized"},
	"n1-highcpu-4":  {4, 3.6, "Compute optimized"},
	"n1-highcpu-8":  {8, 7.2, "Compute optimized"},
	"n1-highcpu-16": {16, 14.4, "Compute optimized"},
	"n1-highcpu-32": {32, 28.8, "Compute optimized"},
	"n1-highcpu-64": {64, 57.6, "Compute optimized"},
	"n1-highcpu-96": {96, 86.4, "Compute optimized"},

	// N2 Standard
	"n2-standard-2":   {2, 8, "General purpose"},
	"n2-standard-4":   {4, 16, "General purpose"},
	"n2-standard-8":   {8, 32, "General purpose"},
	"n2-standard-16":  {16, 64, "General purpose"},
	"n2-standard-32":  {32, 128, "General purpose"},
	"n2-standard-48":  {48, 192, "General purpose"},
	"n2-standard-64":  {64, 256, "General purpose"},
	"n2-standard-80":  {80, 320, "General purpose"},
	"n2-standard-96":  {96, 384, "General purpose"},
	"n2-standard-128": {128, 512, "General purpose"},

	// N2D Standard (AMD)
	"n2d-standard-2":   {2, 8, "General purpose"},
	"n2d-standard-4":   {4, 16, "General purpose"},
	"n2d-standard-8":   {8, 32, "General purpose"},
	"n2d-standard-16":  {16, 64, "General purpose"},
	"n2d-standard-32":  {32, 128, "General purpose"},
	"n2d-standard-48":  {48, 192, "General purpose"},
	"n2d-standard-64":  {64, 256, "General purpose"},
	"n2d-standard-80":  {80, 320, "General purpose"},
	"n2d-standard-96":  {96, 384, "General purpose"},
	"n2d-standard-128": {128, 512, "General purpose"},
	"n2d-standard-224": {224, 896, "General purpose"},

	// N2D High Memory (AMD)
	"n2d-highmem-2":  {2, 16, "Memory optimized"},
	"n2d-highmem-4":  {4, 32, "Memory optimized"},
	"n2d-highmem-8":  {8, 64, "Memory optimized"},
	"n2d-highmem-16": {16, 128, "Memory optimized"},
	"n2d-highmem-32": {32, 256, "Memory optimized"},
	"n2d-highmem-48": {48, 384, "Memory optimized"},
	"n2d-highmem-64": {64, 512, "Memory optimized"},
	"n2d-highmem-80": {80, 640, "Memory optimized"},
	"n2d-highmem-96": {96, 768, "Memory optimized"},

	// E2 Standard (Cost-optimized)
	"e2-standard-2":  {2, 8, "General purpose"},
	"e2-standard-4":  {4, 16, "General purpose"},
	"e2-standard-8":  {8, 32, "General purpose"},
	"e2-standard-16": {16, 64, "General purpose"},
	"e2-standard-32": {32, 128, "General purpose"},

	// C2 Compute-optimized
	"c2-standard-4":  {4, 16, "Compute optimized"},
	"c2-standard-8":  {8, 32, "Compute optimized"},
	"c2-standard-16": {16, 64, "Compute optimized"},
	"c2-standard-30": {30, 120, "Compute optimized"},
	"c2-standard-60": {60, 240, "Compute optimized"},

	// C2D Compute-optimized (AMD)
	"c2d-standard-2":   {2, 8, "Compute optimized"},
	"c2d-standard-4":   {4, 16, "Compute optimized"},
	"c2d-standard-8":   {8, 32, "Compute optimized"},
	"c2d-standard-16":  {16, 64, "Compute optimized"},
	"c2d-standard-32":  {32, 128, "Compute optimized"},
	"c2d-standard-56":  {56, 224, "Compute optimized"},
	"c2d-standard-112": {112, 448, "Compute optimized"},

	// C4 Compute-optimized (AMD)
	"c4-standard-2":         {2, 7, "General purpose"},
	"c4-standard-4":         {4, 15, "General purpose"},
	"c4-standard-8":         {8, 30, "General purpose"},
	"c4-standard-16":        {16, 60, "General purpose"},
	"c4-standard-24":        {24, 90, "General purpose"},
	"c4-standard-32":        {32, 120, "General purpose"},
	"c4-standard-48":        {48, 180, "General purpose"},
	"c4-standard-96":        {96, 360, "General purpose"},
	"c4-standard-144":       {144, 540, "General purpose"},
	"c4-standard-192":       {192, 720, "General purpose"},
	"c4-standard-288":       {288, 1080, "General purpose"},
	"c4-standard-288-metal": {288, 1080, "General purpose"},

	// M1 Memory-optimized
	"m1-ultramem-40":  {40, 961, "Memory optimized"},
	"m1-ultramem-80":  {80, 1922, "Memory optimized"},
	"m1-ultramem-160": {160, 3844, "Memory optimized"},
	"m1-megamem-96":   {96, 1433.6, "Memory optimized"},

	// M2 Memory-optimized
	"m2-ultramem-208": {208, 5888, "Memory optimized"},
	"m2-ultramem-416": {416, 11776, "Memory optimized"},
	"m2-megamem-416":  {416, 5888, "Memory optimized"},

	// T2D Shared-core (burstable)
	"t2d-standard-1": {1, 4, "General purpose"},
	"t2d-standard-2": {2, 8, "General purpose"},
	"t2d-standard-4": {4, 16, "General purpose"},
	"t2d-standard-8": {8, 32, "General purpose"},

	// T2A Shared-core (ARM)
	"t2a-standard-1": {1, 4, "General purpose"},
	"t2a-standard-2": {2, 8, "General purpose"},
	"t2a-standard-4": {4, 16, "General purpose"},
	"t2a-standard-8": {8, 32, "General purpose"},
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
