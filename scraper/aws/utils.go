package aws

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
)

func capitalize(s string) string {
	spaceSplit := strings.Split(s, " ")
	for i, word := range spaceSplit {
		spaceSplit[i] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(spaceSplit, " ")
}

var ROUGHLY_JS_KEY = regexp.MustCompile(`(\w+):`)

func fetchDataFromAWSWebsite(url string, v any) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to fetch data from AWS website: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	err = json.Unmarshal(body, v)
	if err != nil {
		// Try looking for the first usage of "callback(" and the last usage of ")"
		bodyStr := string(body)
		callbackStart := strings.Index(bodyStr, "callback(")
		callbackEnd := strings.LastIndex(bodyStr, ")")
		if callbackStart == -1 || callbackEnd == -1 {
			return err
		}
		body = []byte(ROUGHLY_JS_KEY.ReplaceAllString(bodyStr[callbackStart+9:callbackEnd], `"$1":`))
		err = json.Unmarshal(body, v)
		if err != nil {
			return err
		}
	}
	return nil
}

func cleanEmptyRegions(pricing map[Region]map[OS]any, regionDescriptions map[string]string) map[string]string {
	for region, regionData := range pricing {
		okOsCount := 0
		for os, osData := range regionData {
			switch v := osData.(type) {
			case *EC2PricingData:
				if v.OnDemand == "0" && v.Reserved != nil && len(*v.Reserved) == 0 {
					// Remove this OS from the instance
					delete(regionData, os)
				} else {
					// Keep this OS
					okOsCount++
				}
			case *genericAwsPricingData:
				if v.OnDemand == 0 && len(v.Reserved) == 0 {
					// Remove this OS from the instance
					delete(regionData, os)
				} else {
					// Keep this OS
					okOsCount++
				}
			default:
				okOsCount++
			}
		}
		if okOsCount == 0 {
			delete(pricing, region)
		}
	}
	regions := make(map[string]string)
	for region := range pricing {
		regions[region] = regionDescriptions[region]
	}
	return regions
}

func addPrettyName(instanceType string, familyNames map[string]string) string {
	instanceSplit := strings.Split(instanceType, ".")
	family := instanceSplit[0]
	short := instanceSplit[1]
	prefix, ok := familyNames[family]
	if !ok {
		prefix = strings.ToUpper(family)
	}

	extra := ""
	extraFound := true
	switch {
	case strings.HasPrefix(short, "8x"):
		extra = "Eight"
	case strings.HasPrefix(short, "4x"):
		extra = "Quadruple"
	case strings.HasPrefix(short, "2x"):
		extra = "Double"
	case strings.HasPrefix(short, "10x"):
		extra = "Deca"
	case strings.HasPrefix(short, "12x"):
		extra = "12xlarge"
	case strings.HasPrefix(short, "16x"):
		extra = "16xlarge"
	case strings.HasPrefix(short, "x"):
		extra = ""
	default:
		extraFound = false
	}
	bits := []string{prefix}
	if extraFound {
		bits = append(bits, extra, "Extra")
		short = "Large"
	}
	bits = append(bits, capitalize(short))

	pName := ""
	nonBlanks := 0
	for _, chunk := range bits {
		if chunk != "" {
			nonBlanks++
			if nonBlanks > 1 {
				pName += " "
			}
			pName += chunk
		}
	}
	return pName
}

func processGenericHalfReservedOffer(offer RegionTerm, getPricingData func() *genericAwsPricingData) {
	termCode := translateGenericAwsReservedTermAttributes(offer.TermAttributes)
	for _, offer := range offer.PriceDimensions {
		descLower := strings.ToLower(offer.Description)
		for _, chunk := range BAD_DESCRIPTION_CHUNKS {
			if strings.Contains(descLower, chunk) {
				// Skip these for now
				return
			}
		}

		usd := offer.PricePerUnit["USD"]
		if usd != "" && usd != "0" {
			f := floaty(usd)
			switch termCode {
			case "yrTerm1Standard.partialUpfront", "yrTerm1Standard.allUpfront":
				f = f / 365 / 24
			case "yrTerm3Standard.partialUpfront", "yrTerm3Standard.allUpfront":
				f = f / (365 * 3) / 24
			}
			if f != 0 {
				getPricingData().Reserved[termCode] = f
			}
		} else {
			log.Fatalln("Reserved pricing data has no USD price", offer)
		}
	}
}

func clearHalfEmptyRegions(pricing map[string]*genericAwsPricingData, regionDescriptions map[string]string) map[string]string {
	for region, regionData := range pricing {
		if regionData.OnDemand == 0 && len(regionData.Reserved) == 0 {
			// Remove this region
			delete(pricing, region)
		}
	}
	regions := make(map[string]string)
	for region := range pricing {
		regions[region] = regionDescriptions[region]
	}
	return regions
}
