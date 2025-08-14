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
	// This is all got from the specifications and pricing API's.
	PrettyName string                               `json:"pretty_name"`
	Family     string                               `json:"family"`
	Category   string                               `json:"category"`
	Vcpu       float64                              `json:"vcpu"`
	Memory     float64                              `json:"memory"`
	Size       float64                              `json:"size"`
	GPU        any                                  `json:"GPU"`
	Pricing    map[string]map[string]map[string]any `json:"pricing"`
	Regions    map[string]string                    `json:"regions"`

	// Everything from the compute API.
	AvailabilityZones map[string]any `json:"availability_zones"`
	PrettyNameAzure   string         `json:"pretty_name_azure,omitempty"`
	AzureSpecsData    `json:",inline"`

	disownedFromFamily bool
}

func enrichAzureInstance(instance *AzureInstance, instanceAttrs map[string]any, specsApiResponse *utils.SlowBuildingMap[string, *AzureSpecsApiIteratorItem], type_ string) {
	// Get the initial information from the fast loading json.
	instance.PrettyName = instanceAttrs["instanceName"].(string)
	instance.Family = instanceAttrs["series"].(string)
	instance.Category = instanceAttrs["category"].(string)
	instance.Vcpu = instanceAttrs["cores"].(float64)
	instance.Memory = instanceAttrs["ram"].(float64)
	vf, ok := instanceAttrs["diskSize"].(float64)
	if ok {
		instance.Size = vf
	}
	vs, ok := instanceAttrs["gpu"]
	if ok {
		instance.GPU = vs
	}

	// Get the instance type from the specs api.
	specs, ok := specsApiResponse.Get(strings.ReplaceAll(strings.ToLower(type_+instance.InstanceType), "_", ""))
	if !ok {
		return
	}
	if instance.PrettyNameAzure == "" {
		instance.PrettyNameAzure = strings.ReplaceAll(specs.Name, "_", " ")
	} else if !instance.disownedFromFamily {
		instance.disownedFromFamily = true
		spaceSplit := strings.Split(instance.PrettyNameAzure, " ")
		instance.PrettyNameAzure = strings.Join(spaceSplit[1:], " ")
	}

	// Parse the specs.
	parseSpecs(&instance.AzureSpecsData, specs.Capabilities)
}

func processSpecsDataResult(instances map[string]*AzureInstance, instanceAttrs map[string]map[string]any, specsApiResponse *utils.SlowBuildingMap[string, *AzureSpecsApiIteratorItem]) {
	keysSorted := make([]string, 0, len(instanceAttrs))
	for k := range instanceAttrs {
		keysSorted = append(keysSorted, k)
	}
	sort.Strings(keysSorted)

	for _, k := range keysSorted {
		v := instanceAttrs[k]
		dashSplit := strings.Split(k, "-")
		if len(dashSplit) < 2 {
			continue
		}
		instance, ok := instances[dashSplit[1]]
		if !ok {
			instance = &AzureInstance{
				GPU:               "0",
				Regions:           make(map[string]string),
				AvailabilityZones: make(map[string]any),
				Pricing:           make(map[string]map[string]map[string]any),
				AzureSpecsData: AzureSpecsData{
					InstanceType: dashSplit[1],
					Arch:         []string{},
				},
			}
			instances[dashSplit[1]] = instance
		}
		enrichAzureInstance(instance, v, specsApiResponse, dashSplit[2])
	}
}

func processAzureOsResponse(osSlug string, instances map[string]*AzureInstance, instancesMu *sync.Mutex, specsApiResponse *utils.SlowBuildingMap[string, *AzureSpecsApiIteratorItem]) {
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

	err = os.MkdirAll("www/azure", 0777)
	if err != nil {
		log.Fatal(err)
	}

	m, ok := a["attributesByOffer"]
	if !ok {
		log.Fatal("attributesByOffer not found")
	}

	log.Default().Println("Saving Azure OS response for", osSlug)
	utils.WriteAndCompressFile("www/azure/"+osSlug+".json", b)

	instancesMu.Lock()
	processSpecsDataResult(instances, m, specsApiResponse)
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
					if len(reserved) == 0 {
						delete(os, "reserved")
					}
				} else {
					x, ok := respVal[k2]
					if ok {
						os[v] = x
					}
				}
			}
		}

		if len(os) == 0 {
			delete(regionData, osSlug)
			if len(regionData) == 0 {
				delete(instance, region)
				if len(instance) == 0 {
					delete(instancesPricing, instanceType)
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

	err = os.MkdirAll("www/azure", 0777)
	if err != nil {
		log.Fatal(err)
	}

	log.Default().Println("Saving Azure OS response for", region, osSlug)
	utils.WriteAndCompressFile("www/azure/"+region+"_"+osSlug+".json", b)

	instancesPricingMu.Lock()
	processPricingDataResult(instancesPricing, region, osSlug, a)
	instancesPricingMu.Unlock()
}

func processAzureApi(regionsAndOsData *AzureRootData, specsApiResponse *utils.SlowBuildingMap[string, *AzureSpecsApiIteratorItem]) map[string]*AzureInstance {
	instancesPricing := make(map[string]map[string]map[string]map[string]any)
	instancesPricingMu := sync.Mutex{}

	instances := make(map[string]*AzureInstance)
	instancesMu := sync.Mutex{}

	var fg utils.FunctionGroup

	for _, os := range regionsAndOsData.OperatingSystems {
		fg.Add(func() {
			processAzureOsResponse(os.Slug, instances, &instancesMu, specsApiResponse)
		})
		for _, region := range regionsAndOsData.Regions {
			fg.Add(func() {
				processPricingDataForRegionAndOs(region.Slug, os.Slug, instancesPricing, &instancesPricingMu)
			})
		}
	}

	fg.Run()

	regionMap := make(map[string]string)
	for _, region := range regionsAndOsData.Regions {
		regionMap[region.Slug] = region.DisplayName
	}

	for instanceType, pricing := range instancesPricing {
		instance, ok := instances[instanceType]
		if !ok {
			continue
		}
		instance.Pricing = pricing
		regions := make(map[string]string)
		for region := range pricing {
			regions[region] = regionMap[region]
		}
		instance.Regions = regions
	}

	return instances
}

type AzureSpecsApiIteratorItemCapability struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type AzureSpecsApiIteratorItem struct {
	ResourceType string                                `json:"resourceType"`
	Capabilities []AzureSpecsApiIteratorItemCapability `json:"capabilities"`
	Name         string                                `json:"name"`
	Tier         string                                `json:"tier"`
	Size         string                                `json:"size"`
	Family       string                                `json:"family"`
}

type AzureSpecsApiIteratorResult struct {
	Value    []*AzureSpecsApiIteratorItem `json:"value"`
	NextLink *string                      `json:"nextLink"`
}

func getAzureSpecsApiIterator() *utils.SlowBuildingMap[string, *AzureSpecsApiIteratorItem] {
	return utils.NewSlowBuildingMap(func(pushChunk func(map[string]*AzureSpecsApiIteratorItem)) {
		// Get everything we need to start the request.
		accessToken := getAzureAccessToken()
		subId := os.Getenv("AZURE_SUBSCRIPTION_ID")
		if subId == "" {
			log.Fatal("AZURE_SUBSCRIPTION_ID must be set")
		}

		// Handle getting the raw skus.
		rawSkus := []*AzureSpecsApiIteratorItem{}
		apiUrl := "https://management.azure.com/subscriptions/" + subId + "/providers/Microsoft.Compute/skus?api-version=2021-07-01"
		for apiUrl != "" {
			// Firstly, cast into a raw message. We need to process this twice.
			var rm json.RawMessage
			if err := utils.LoadJsonWithBearerToken(apiUrl, &rm, &accessToken); err != nil {
				log.Fatal(err)
			}

			// Process it into the iterator result.
			var a AzureSpecsApiIteratorResult
			if err := json.Unmarshal(rm, &a); err != nil {
				log.Fatal(err)
			}
			rawSkus = append(rawSkus, a.Value...)

			// Remap it by the size.
			remapped := make(map[string]*AzureSpecsApiIteratorItem)
			for _, item := range a.Value {
				remapped[strings.ReplaceAll(strings.ToLower(item.Name), "_", "")] = item
			}
			pushChunk(remapped)

			// Get the next link.
			if a.NextLink == nil {
				apiUrl = ""
			} else {
				apiUrl = *a.NextLink
			}
		}

		// Write the skus to a file.
		processRawSkuSpecs(rawSkus)
	})
}

// DoAzureScraping is the main function that scrapes the Azure pricing data and saves it to a file.
func DoAzureScraping() {
	specsApiResponse := getAzureSpecsApiIterator()

	var regionsAndOsData AzureRootData
	if err := utils.LoadJson("https://azure.microsoft.com/api/v4/pricing/virtual-machines/metadata/", &regionsAndOsData); err != nil {
		log.Fatal(err)
	}

	// Process the instances and pricing data
	instances := processAzureApi(&regionsAndOsData, specsApiResponse)

	// Warn about any instances that have specs missing.
	for _, instance := range instances {
		if instance.PrettyNameAzure == "" {
			instance.PrettyNameAzure = instance.PrettyName
		}
	}

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
