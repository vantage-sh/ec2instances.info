package gcp

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"scraper/utils"
	"strconv"
	"strings"
)

const (
	GCP_BILLING_API_BASE = "https://cloudbilling.googleapis.com"
	GCP_COMPUTE_API_BASE = "https://compute.googleapis.com/compute/v1"
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

// Compute Engine API structures
type RegionList struct {
	Items []ComputeRegion `json:"items"`
}

type ComputeRegion struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type MachineTypeAggregatedList struct {
	Items map[string]MachineTypesScopedList `json:"items"`
}

type MachineTypesScopedList struct {
	MachineTypes []MachineType `json:"machineTypes"`
}

type MachineType struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	GuestCpus   int    `json:"guestCpus"`
	MemoryMb    int    `json:"memoryMb"`
	Zone        string `json:"zone"`
}

// Helper function to make API requests with API key or Bearer token
func makeGCPRequest(url string, apiKey string, token string, result interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	q := req.URL.Query()
	if apiKey != "" {
		q.Add("key", apiKey)
	}
	req.URL.RawQuery = q.Encode()

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

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
func fetchComputeSKUs(apiKey, token string) ([]SKU, error) {
	var allSKUs []SKU
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/v2beta/skus?pageSize=5000&filter=service=\"services/%s\"", GCP_BILLING_API_BASE, COMPUTE_SERVICE_ID)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response SKUsResponse
		if err := makeGCPRequest(url, apiKey, token, &response); err != nil {
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
func fetchPricing(apiKey, token string) (map[string]PriceInfo, error) {
	priceMap := make(map[string]PriceInfo)
	pageToken := ""

	for {
		url := fmt.Sprintf("%s/v1beta/skus/-/prices?pageSize=5000", GCP_BILLING_API_BASE)
		if pageToken != "" {
			url += "&pageToken=" + pageToken
		}

		var response PricesResponse
		if err := makeGCPRequest(url, apiKey, token, &response); err != nil {
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

// Fetch all regions
func fetchRegions(projectID, apiKey, token string) ([]ComputeRegion, error) {
	url := fmt.Sprintf("%s/projects/%s/regions", GCP_COMPUTE_API_BASE, projectID)
	
	var response RegionList
	if err := makeGCPRequest(url, apiKey, token, &response); err != nil {
		return nil, fmt.Errorf("failed to fetch regions: %w", err)
	}

	return response.Items, nil
}

// Fetch region display names from GCP documentation
func fetchRegionNamesFromDocs() (map[string]string, error) {
	url := "https://cloud.google.com/compute/docs/regions-zones"
	
	root, err := utils.LoadHTML(url)
	if err != nil {
		return nil, fmt.Errorf("failed to load HTML: %w", err)
	}

	regionNames := make(map[string]string)
	
	// Find all table rows in the regions table
	// The structure has zone names like "africa-south1-a" followed by location like "Johannesburg, South Africa"
	trs := root.FindAll("tr")
	
	for _, tr := range trs {
		tds := tr.FindAll("td")
		if len(tds) < 2 {
			continue
		}
		
		// First td contains the zone name (e.g., "africa-south1-a")
		// It might be in a nested element like <code>
		var zoneName string
		codeTag := tds[0].Find("code")
		if codeTag.Error == nil {
			zoneName = strings.TrimSpace(codeTag.Text())
		} else {
			zoneName = strings.TrimSpace(tds[0].Text())
		}
		
		// Second td contains the location (e.g., "Johannesburg, South Africa")
		location := strings.TrimSpace(tds[1].Text())
		
		if zoneName == "" || location == "" {
			continue
		}
		
		// Extract region from zone name (remove the zone suffix like "-a", "-b", etc.)
		// Zone format: region-zone (e.g., "us-central1-a" -> "us-central1")
		parts := strings.Split(zoneName, "-")
		if len(parts) < 3 {
			continue
		}
		
		// Region is everything except the last part
		region := strings.Join(parts[:len(parts)-1], "-")
		
		// Extract just the city/state name from location
		// Format: "City, State/Country" or "City, Country, Region"
		// We want just the first part (city/state)
		locationParts := strings.Split(location, ",")
		if len(locationParts) > 0 {
			prettyName := strings.TrimSpace(locationParts[0])
			// Only store if we haven't seen this region yet (first zone wins)
			if _, exists := regionNames[region]; !exists {
				regionNames[region] = prettyName
			}
		}
	}
	
	return regionNames, nil
}

// Fetch all machine types
func fetchMachineTypes(projectID, apiKey, token string) (map[string]MachineType, error) {
	url := fmt.Sprintf("%s/projects/%s/aggregated/machineTypes", GCP_COMPUTE_API_BASE, projectID)
	
	var response MachineTypeAggregatedList
	if err := makeGCPRequest(url, apiKey, token, &response); err != nil {
		return nil, fmt.Errorf("failed to fetch machine types: %w", err)
	}

	machineTypes := make(map[string]MachineType)
	for _, scope := range response.Items {
		for _, mt := range scope.MachineTypes {
			// We only need one definition per machine type name, as they are consistent across zones
			// usually.
			if _, exists := machineTypes[mt.Name]; !exists {
				machineTypes[mt.Name] = mt
			}
		}
	}
	return machineTypes, nil
}

// Parse machine type from display name
// Examples from GCP API:
// "N1 Predefined Instance Ram running in Zurich"
// "Spot Preemptible E2 Custom Instance Core running in Paris"
// "Compute optimized Core running in Americas"
// "Sole Tenancy Instance RAM running in Jakarta"
// "Licensing Fee for Windows Server 2012 BYOL (CPU cost)"
// "Licensing Fee for Windows Server 2012 BYOL (RAM cost)"
var machineTypeRegex = regexp.MustCompile(`(?i)(n2d|n2|n1|e2a|e2|c2d|c2|m1|m2|m3|m4|t2d|t2a|a2|a3|g2|h3|c3d|c3|z3|c4|n4).*(?:instance\s+(core|ram)|\((?:cpu|ram)\s+cost\))`)

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


// Parse instance specifications from GCP machine type definitions
// This is a simplified mapping - in production you'd want to fetch this from GCP API

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
