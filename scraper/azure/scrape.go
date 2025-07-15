package azure

import (
	"encoding/json"
	"log"
	"os"
	"scraper/utils"
	"sort"
	"strings"
	"sync"
)

type AzureItem struct {
	Slug        string `json:"slug"`
	DisplayName string `json:"displayName"`
}

type AzureRootData struct {
	Regions          []AzureItem `json:"regions"`
	OperatingSystems []AzureItem `json:"operatingSystems"`
}

const AZURE_OS_URL = "https://azure.microsoft.com/api/v3/pricing/virtual-machines/page/details/{}/?showLowPriorityOffers=true"

// AzureInstance is the instance data for a specific instance type in a specific region.
type AzureInstance struct {
	InstanceType    string                               `json:"instance_type"`
	PrettyName      string                               `json:"pretty_name"`
	PrettyNameAzure string                               `json:"pretty_name_azure"`
	Pricing         map[string]map[string]map[string]any `json:"pricing"`
}

func enrichAzureInstance(instance *AzureInstance, instanceAttrs map[string]any) {
	// TODO
}

func processSpecsDataResult(instances map[string]*AzureInstance, instanceAttrs map[string]map[string]any) {
	for k, v := range instanceAttrs {
		dashSplit := strings.Split(k, "-")
		if len(dashSplit) < 2 {
			continue
		}
		instance, ok := instances[dashSplit[1]]
		if !ok {
			instance = &AzureInstance{
				InstanceType: dashSplit[1],
			}
			instances[dashSplit[1]] = instance
		}
		enrichAzureInstance(instance, v)
	}
}

func processAzureOsResponse(osSlug string, instances map[string]*AzureInstance, instancesMu *sync.Mutex) {
	url := strings.Replace(AZURE_OS_URL, "{}", osSlug, 1)

	var rm json.RawMessage
	if err := utils.LoadJson(url, &rm); err != nil {
		log.Fatal(err)
	}

	var a map[string]map[string]map[string]any
	if err := json.Unmarshal(rm, &a); err != nil {
		log.Fatal(err)
	}

	b, err := json.MarshalIndent(a, "", "    ")
	if err != nil {
		log.Fatal(err)
	}

	err = os.MkdirAll("www/azure", 0755)
	if err != nil {
		log.Fatal(err)
	}

	m, ok := a["attributesByOffer"]
	if !ok {
		log.Fatal("attributesByOffer not found")
	}

	log.Default().Println("Saving Azure OS response for", osSlug)
	err = os.WriteFile("www/azure/"+osSlug+".json", b, 0644)
	if err != nil {
		log.Fatal(err)
	}

	instancesMu.Lock()
	processSpecsDataResult(instances, m)
	instancesMu.Unlock()
}

var COPY_KEYS = map[string]map[string]string{
	"basic": {
		"perhour":     "basic",      // 0.032,
		"perhourspot": "basic-spot", // 0.007731,
		// "perhourhybridbenefit": 0.023,
		// "perhourpaygoneyearsubscription": 0.05405,
		// "perhourpaygthreeyearsubscription": 0.0437,
		// "perhourspothybridbenefit": 0.003705
	},
	"lowpriority": {
		"perhour": "lowpriority", // 1.044,
		//"perhourhybridbenefit": 0.375,
		// "perhourpaygoneyearsubscription": 0.4371,
		// "perhourpaygthreeyearsubscription": 0.4164
	},
	"standard": {
		"perhour":                               "ondemand",                      // 2.61,
		"perhouroneyearreserved":                "yrTerm1Standard.allUpfront",    // 1.84159
		"perhourthreeyearreserved":              "yrTerm3Standard.allUpfront",    // 1.44806,
		"perunitoneyearsavings":                 "yrTerm1Savings.allUpfront",     // 2.00432,
		"perunitthreeyearsavings":               "yrTerm3Savings.allUpfront",     // 1.62371,
		"perhourspot":                           "spot_min",                      // 0.427518,
		"perhourhybridbenefit":                  "hybridbenefit",                 // 1.874,
		"perhouroneyearreservedhybridbenefit":   "yrTerm1Standard.hybridbenefit", // 1.10559,
		"perhourthreeyearreservedhybridbenefit": "yrTerm3Standard.hybridbenefit", // 0.71206,
		"perunitoneyearsavingshybridbenefit":    "yrTerm3Savings.hybridbenefit",  // 1.26832,
		"perunitthreeyearsavingshybridbenefit":  "yrTerm3Savings.hybridbenefit",  // 0.88771,
		"perhourpaygoneyearsubscription":        "yrTerm1Standard.subscription",  // 1.9361,
		"perhourpaygthreeyearsubscription":      "yrTerm3Standard.subscription",  // 1.9154,
		// "perhouroneyearreservedoneyearsubscription": 1.11241,
		//"perhouroneyearreservedthreeyearsubscription": 1.09171,
		// "perhourthreeyearreservedoneyearsubscription": 0.73856,
		// "perhourthreeyearreservedthreeyearsubscription": 0.71786,
		//"perhourspothybridbenefit": 0.306961
	},
}

func processPricingDataResult(
	instancesPricing map[string]map[string]map[string]map[string]any,
	region string,
	osSlug string,
	pricingResponse map[string]map[string]any,
) {
	for k, respVal := range pricingResponse {
		keySplit := strings.Split(k, "-")
		if len(keySplit) < 2 {
			continue
		}

		instanceType := keySplit[1]
		instance, ok := instancesPricing[instanceType]
		if !ok {
			instance = make(map[string]map[string]map[string]any)
			instancesPricing[instanceType] = instance
		}
		regionData, ok := instance[region]
		if !ok {
			regionData = make(map[string]map[string]any)
			instance[region] = regionData
		}
		os, ok := regionData[osSlug]
		if !ok {
			os = make(map[string]any)
			regionData[osSlug] = os
		}

		if respVal == nil {
			continue
		}

		switch {
		case strings.Contains(k, "basic"):
			basic := COPY_KEYS["basic"]
			for k2, v := range basic {
				x, ok := respVal[k2]
				if ok {
					os[v] = x
				}
			}
		case strings.Contains(k, "lowpriority"):
			lowpriority := COPY_KEYS["lowpriority"]
			for k2, v := range lowpriority {
				x, ok := respVal[k2]
				if ok {
					os[v] = x
				}
			}
		case strings.Contains(k, "standard"):
			standard := COPY_KEYS["standard"]
			for k2, v := range standard {
				if strings.Contains(v, "yrTerm") {
					reserved, ok := os["reserved"].(map[string]any)
					if !ok {
						reserved = make(map[string]any)
						os["reserved"] = reserved
					}
					x, ok := respVal[k2]
					if ok {
						reserved[v] = x
					}
				} else {
					x, ok := respVal[k2]
					if ok {
						os[v] = x
					}
				}
			}
		}
	}
}

const AZURE_PLATFORM_AND_OS_URL = "https://azure.microsoft.com/api/v3/pricing/virtual-machines/page/{}/?showLowPriorityOffers=true"

func processPricingDataForRegionAndOs(
	region string,
	osSlug string,
	instancesPricing map[string]map[string]map[string]map[string]any,
	instancesPricingMu *sync.Mutex,
) {
	var a map[string]map[string]any
	url := strings.Replace(AZURE_PLATFORM_AND_OS_URL, "{}", osSlug+"/"+region, 1)
	if err := utils.LoadJson(url, &a); err != nil {
		log.Fatal(err)
	}

	b, err := json.MarshalIndent(a, "", "    ")
	if err != nil {
		log.Fatal(err)
	}

	err = os.MkdirAll("www/azure", 0755)
	if err != nil {
		log.Fatal(err)
	}

	log.Default().Println("Saving Azure OS response for", region, osSlug)
	err = os.WriteFile("www/azure/"+region+"_"+osSlug+".json", b, 0644)
	if err != nil {
		log.Fatal(err)
	}

	instancesPricingMu.Lock()
	processPricingDataResult(instancesPricing, region, osSlug, a)
	instancesPricingMu.Unlock()
}

func processAzureApi(regionsAndOsData *AzureRootData) map[string]*AzureInstance {
	instancesPricing := make(map[string]map[string]map[string]map[string]any)
	instancesPricingMu := sync.Mutex{}

	instances := make(map[string]*AzureInstance)
	instancesMu := sync.Mutex{}

	var fg utils.FunctionGroup

	for _, os := range regionsAndOsData.OperatingSystems {
		fg.Add(func() {
			processAzureOsResponse(os.Slug, instances, &instancesMu)
		})
		for _, region := range regionsAndOsData.Regions {
			fg.Add(func() {
				processPricingDataForRegionAndOs(region.Slug, os.Slug, instancesPricing, &instancesPricingMu)
			})
		}
	}

	fg.Run()

	for instanceType, pricing := range instancesPricing {
		instance, ok := instances[instanceType]
		if !ok {
			continue
		}
		instance.Pricing = pricing
	}

	return instances
}

// DoAzureScraping is the main function that scrapes the Azure pricing data and saves it to a file.
func DoAzureScraping() {
	var regionsAndOsData AzureRootData
	if err := utils.LoadJson("https://azure.microsoft.com/api/v4/pricing/virtual-machines/metadata/", &regionsAndOsData); err != nil {
		log.Fatal(err)
	}

	// Process the instances and pricing data
	instances := processAzureApi(&regionsAndOsData)

	// Save the instances
	instancesSorted := make([]*AzureInstance, 0, len(instances))
	for _, instance := range instances {
		instancesSorted = append(instancesSorted, instance)
	}
	sort.Slice(instancesSorted, func(i, j int) bool {
		return instancesSorted[i].InstanceType < instancesSorted[j].InstanceType
	})
	utils.SaveInstances(instancesSorted, "www/azure/instances.json")
}
