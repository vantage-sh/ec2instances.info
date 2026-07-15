package ec2

import (
	"log"
	"runtime"
	"scraper/aws/awsutils"
	"scraper/utils"
	"strings"
	"sync"
)

const (
	eksAutoModeProductType = "AutoMode"
	eksAutoModePlatform    = "eks_auto_mode"

	eksPricingRootNonChina = "https://pricing.us-east-1.amazonaws.com"
	eksPricingRootChina    = "https://pricing.cn-north-1.amazonaws.com.cn"
	eksRegionIndexNonChina = "/offers/v1.0/aws/AmazonEKS/current/region_index.json"
	eksRegionIndexChina    = "/offers/v1.0/cn/AmazonEKS/current/region_index.json"
)

// eksRegionIndexEntry is one region in AmazonEKS region_index.json.
// CurrentVersionUrl points at that region's full products+terms JSON.
type eksRegionIndex struct {
	Regions map[string]eksRegionIndexEntry `json:"regions"`
}

type eksRegionIndexEntry struct {
	CurrentVersionUrl string `json:"currentVersionUrl"`
}

func resolveAwsPricingUrl(baseUrl, awsUrl string) string {
	if strings.HasPrefix(awsUrl, "/") {
		return baseUrl + awsUrl
	}
	return awsUrl
}

// applyEksAutoModeRegion writes Auto Mode management fees from one AmazonEKS
// region offer onto matching EC2 instances. products/terms come from the Price
// List RegionData shape (same as EC2/RDS).
func applyEksAutoModeRegion(
	instances map[string]*EC2Instance,
	regionName string,
	data awsutils.RegionData,
	currency string,
	mu *sync.Mutex,
) {
	for sku, product := range data.Products {
		attrs := product.Attributes
		if attrs["eksproducttype"] != eksAutoModeProductType {
			continue
		}

		instanceType := attrs["instancetype"]
		if instanceType == "" {
			continue
		}

		offers, ok := data.Terms.OnDemand[sku]
		if !ok {
			continue
		}

		// There is only one price offering for a given offer.priceDimensions
		unitPriceStr := ""
		for _, offer := range offers {
			for _, priceDimension := range offer.PriceDimensions {
				if priceDimension.PricePerUnit == nil {
					continue
				}
				unitPrice, found := priceDimension.PricePerUnit[currency]
				if found && unitPrice != "" {
					unitPriceStr = unitPrice
					break
				}
			}
		}

		if unitPriceStr == "" {
			continue
		}

		unitPrice := awsutils.Floaty(unitPriceStr)
		if unitPrice == 0 {
			continue
		}

		formatted := formatPrice(unitPrice)

		mu.Lock()
		instance := instances[instanceType]
		if instance == nil {
			mu.Unlock()
			continue
		}
		regionPricing := instance.Pricing[regionName]
		if regionPricing == nil {
			// if the instance doesn't have any pricing data associated with the region, make a new map
			regionPricing = make(map[OS]any)
			instance.Pricing[regionName] = regionPricing
		}
		// Leave OnDemand unset (empty) so cleanEmptyRegions keeps this platform,
		// same pattern as EMR pricing.
		regionPricing[eksAutoModePlatform] = &EC2PricingData{
			EKSAutoMode: formatted,
		}
		instance.EKSAutoMode = true
		mu.Unlock()
	}
}

// addEksAutoModePricing scrapes AmazonEKS Price List Auto Mode management fees
// and attaches them under pricing[region]["eks_auto_mode"], mirroring EMR.
func addEksAutoModePricing(instances map[string]*EC2Instance, china bool) {
	log.Default().Println("Adding EKS Auto Mode pricing to EC2")

	baseUrl := eksPricingRootNonChina
	regionIndexPath := eksRegionIndexNonChina
	currency := "USD"

	if china {
		baseUrl = eksPricingRootChina
		regionIndexPath = eksRegionIndexChina
		currency = "CNY"
	}

	var regionIndex eksRegionIndex
	if err := utils.LoadJson(resolveAwsPricingUrl(baseUrl, regionIndexPath), &regionIndex); err != nil {
		log.Fatalln("Failed to fetch AmazonEKS region index", err)
	}

	type regionJob struct {
		regionName string
		url        string
	}

	jobs := make([]regionJob, 0, len(regionIndex.Regions))
	for regionName, indexEntry := range regionIndex.Regions {
		if indexEntry.CurrentVersionUrl == "" {
			continue
		}
		jobs = append(jobs, regionJob{regionName: regionName, url: indexEntry.CurrentVersionUrl})
	}

	var mu sync.Mutex
	for _, chunk := range utils.Chunk(jobs, 5) {
		fg := utils.FunctionGroup{}
		for _, job := range chunk {
			fg.Add(func() {
				var data awsutils.RegionData
				if err := utils.LoadJson(resolveAwsPricingUrl(baseUrl, job.url), &data); err != nil {
					log.Fatalln("Failed to fetch AmazonEKS region pricing", job.regionName, err)
				}
				applyEksAutoModeRegion(instances, job.regionName, data, currency, &mu)
			})
		}
		fg.Run()
		runtime.GC()
	}
}
