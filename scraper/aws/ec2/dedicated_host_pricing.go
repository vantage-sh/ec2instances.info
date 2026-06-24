package ec2

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"scraper/aws/awsutils"
	"scraper/utils"
	"strconv"
	"strings"
	"sync"
)

// dedicatedHostInstanceTypeMatches reports whether an EC2 instance type
// (e.g. "mac2-m1ultra.metal") corresponds to a Dedicated Host pricing SKU
// (e.g. "mac2-m1ultra"). The match is on the family/base portion of the
// instance type (the part before the first ".") compared for exact equality
// with the SKU instance type.
//
// A plain strings.HasPrefix is incorrect here: many Dedicated Host SKU names
// are prefixes of one another (e.g. "mac2" is a prefix of "mac2-m1ultra",
// "mac-m4" of "mac-m4max", "m5" of "m5d"), so prefix matching lets the wrong
// SKU's price overwrite an instance's price depending on Go map iteration
// order, producing intermittently incorrect prices (issue #896, follow-up to
// #893).
func dedicatedHostInstanceTypeMatches(instanceType, sku string) bool {
	base := instanceType
	if i := strings.IndexByte(instanceType, '.'); i != -1 {
		base = instanceType[:i]
	}
	return base == sku
}

type dedicatedHostOnDemandPrice struct {
	InstanceType string `json:"Instance Type"`
	Price        string `json:"price"`
}

type dedicatedHostOnDemandData struct {
	Regions map[string]map[string]dedicatedHostOnDemandPrice `json:"regions"`
}

func addDedicatedHostOnDemandPrice(instance *EC2Instance, region string, price string) {
	pricingData := instance.Pricing[region]
	if pricingData == nil {
		pricingData = make(map[OS]any)
		instance.Pricing[region] = pricingData
	}
	dedicated, ok := pricingData["dedicated"].(*EC2PricingData)
	price = formatPrice(awsutils.Floaty(price))
	if ok {
		dedicated.OnDemand = price
	} else {
		m := make(map[string]string)
		dedicated = &EC2PricingData{
			Reserved: &m,
			OnDemand: price,
		}
		pricingData["dedicated"] = dedicated
	}
}

type dedicatedHostReservedPrice struct {
	InstanceType        string
	Price               string
	UpfrontPricePerUnit string
	LeaseContractLength string
	PurchaseOption      string
}

func (d *dedicatedHostReservedPrice) UnmarshalJSON(data []byte) error {
	// Try to unmarshal as US site
	type tmp1 struct {
		InstanceType        string `json:"Instance Type"`
		Price               string `json:"price"`
		UpfrontPricePerUnit string `json:"riupfront:PricePerUnit"`
		LeaseContractLength string `json:"LeaseContractLength"`
		PurchaseOption      string `json:"PurchaseOption"`
	}
	var tmp tmp1
	if err := json.Unmarshal(data, &tmp); err != nil {
		return err
	}
	if tmp.InstanceType != "" {
		d.InstanceType = tmp.InstanceType
		d.Price = tmp.Price
		d.UpfrontPricePerUnit = tmp.UpfrontPricePerUnit
		d.LeaseContractLength = tmp.LeaseContractLength
		d.PurchaseOption = tmp.PurchaseOption
		return nil
	}

	// Try to unmarshal as China site
	type tmp2 struct {
		InstanceType        string `json:"ec2:InstanceType"`
		Price               string `json:"price"`
		UpfrontPricePerUnit string `json:"ec2:PricePerUnit"`
		LeaseContractLength string `json:"plc:LeaseContract"`
		PurchaseOption      string `json:"PurchaseOption"`
	}
	var tmpSecond tmp2
	if err := json.Unmarshal(data, &tmpSecond); err != nil {
		return err
	}
	if tmpSecond.InstanceType != "" {
		d.InstanceType = tmpSecond.InstanceType
		d.Price = tmpSecond.Price
		d.UpfrontPricePerUnit = tmpSecond.UpfrontPricePerUnit
		d.LeaseContractLength = tmpSecond.LeaseContractLength
		d.PurchaseOption = tmpSecond.PurchaseOption
		return nil
	}
	return fmt.Errorf("failed to unmarshal dedicated host reserved price")
}

type dedicatedHostReservedData struct {
	Regions map[string]map[string]dedicatedHostReservedPrice `json:"regions"`
}

const (
	DEDICATED_HOST_RESERVED_URL_BASE_US = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/dedicatedhost-reservedinstance-virtual/"
	DEDICATED_HOST_RESERVED_URL_BASE_CN = "https://calculator.amazonaws.cn/pricing/2.0/meteredUnitMaps/aws-cn/computesavingsplan/CNY/current/compute-ec2-calc/"
)

var YEAR_PART = regexp.MustCompile(`^(\d+) *(yr|year)$`)

func processYear(s string) *string {
	x := YEAR_PART.FindStringSubmatch(s)
	if x == nil {
		return nil
	}
	return &x[1]
}

var (
	allUpfront     = "allUpfront"
	partialUpfront = "partialUpfront"
	noUpfront      = "noUpfront"
)

func processPurchaseOption(s string) *string {
	s = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(s), " ", ""))
	switch s {
	case "noupfront":
		return &noUpfront
	case "partialupfront":
		return &partialUpfront
	case "allupfront":
		return &allUpfront
	default:
		return nil
	}
}

func loadDedicatedHostReservedData(
	region string,
	regionsInverted map[string]string,
	term string,
	paymentOption string,
	instances map[string]*EC2Instance,
	instancesMu *sync.Mutex,
	china bool,
) {
	regionEncoded := url.PathEscape(region)
	termEncoded := url.PathEscape(term)
	paymentOptionEncoded := url.PathEscape(paymentOption)

	var url string
	if china {
		termSplit := strings.Split(term, " ")
		url = fmt.Sprintf(
			"%s%s/Dedicated/Linux/NA/%s/%s/index.json",
			DEDICATED_HOST_RESERVED_URL_BASE_CN, regionEncoded, termSplit[0], paymentOptionEncoded,
		)
	} else {
		url = fmt.Sprintf(
			"%s%s/%s/%s/index.json",
			DEDICATED_HOST_RESERVED_URL_BASE_US, regionEncoded, termEncoded, paymentOptionEncoded,
		)
	}

	var dedicatedHostReservedData dedicatedHostReservedData
	err := awsutils.FetchDataFromAWSWebsite(url, &dedicatedHostReservedData)
	if err != nil {
		return
	}

	for regionName, instanceData := range dedicatedHostReservedData.Regions {
		for _, reservedPrice := range instanceData {
			yearPtr := processYear(reservedPrice.LeaseContractLength)
			if yearPtr == nil {
				utils.SendWarning("Dedicated host reserved data has unknown year", reservedPrice.LeaseContractLength, "for", reservedPrice.InstanceType)
				continue
			}
			purchaseOptionPtr := processPurchaseOption(reservedPrice.PurchaseOption)
			if purchaseOptionPtr == nil {
				utils.SendWarning("Dedicated host reserved data has unknown purchase option", reservedPrice.PurchaseOption, "for", reservedPrice.InstanceType)
				continue
			}
			riTranslated := "yrTerm" + *yearPtr + "Standard." + *purchaseOptionPtr

			regionSlug := regionsInverted[regionName]
			if regionSlug == "" {
				utils.SendWarning("Dedicated host reserved data has unknown region", regionName)
				continue
			}

			var upfrontPrice float64
			leaseInYearsStr := START_NUMBERS.FindString(reservedPrice.LeaseContractLength)
			if leaseInYearsStr != "" {
				leaseInYears, err := strconv.Atoi(leaseInYearsStr)
				if err != nil {
					log.Fatalln("Failed to parse lease contract length", reservedPrice.LeaseContractLength)
				}
				hoursInTerm := leaseInYears * 365 * 24
				if reservedPrice.UpfrontPricePerUnit != "" {
					upfrontPrice = awsutils.Floaty(reservedPrice.UpfrontPricePerUnit) / float64(hoursInTerm)
				}
			}
			price := awsutils.Floaty(reservedPrice.Price) + upfrontPrice

			instancesMu.Lock()
			for instanceType, instance := range instances {
				if dedicatedHostInstanceTypeMatches(instanceType, reservedPrice.InstanceType) {
					pricingData := instance.Pricing[regionSlug]
					if pricingData == nil {
						pricingData = make(map[OS]any)
						instance.Pricing[regionSlug] = pricingData
					}
					dedicated, ok := pricingData["dedicated"].(*EC2PricingData)
					if ok {
						(*dedicated.Reserved)[riTranslated] = formatPrice(price)
					} else {
						m := map[string]string{
							riTranslated: formatPrice(price),
						}
						dedicated = &EC2PricingData{
							Reserved: &m,
							OnDemand: "0",
						}
						pricingData["dedicated"] = dedicated
					}
				}
			}
			instancesMu.Unlock()
		}
	}
}

const DEDICATED_HOST_ON_DEMAND_URL_US = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/dedicatedhost-ondemand.json"

var (
	DEDICATED_TERMS           = []string{"3 year", "1 year"}
	DEDICATED_PAYMENT_OPTIONS = []string{"No Upfront", "Partial Upfront", "All Upfront"}
)

func addDedicatedHostPricingUs(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	log.Default().Println("Adding dedicated host pricing to EC2 (other regions)")

	// Get the on demand pricing data
	var dedicatedHostOnDemandData dedicatedHostOnDemandData
	err := awsutils.FetchDataFromAWSWebsite(DEDICATED_HOST_ON_DEMAND_URL_US, &dedicatedHostOnDemandData)
	if err != nil {
		log.Fatalln("Failed to fetch dedicated host on demand data", err)
	}

	// Process the on demand pricing data
	for regionName, instanceData := range dedicatedHostOnDemandData.Regions {
		region := regionsInverted[regionName]
		if region == "" {
			continue
		}

		for _, price := range instanceData {
			for instanceType, instance := range instances {
				if dedicatedHostInstanceTypeMatches(instanceType, price.InstanceType) {
					addDedicatedHostOnDemandPrice(instance, region, price.Price)
				}
			}
		}
	}

	// Get the reserved pricing data
	var fg utils.FunctionGroup
	instancesMu := &sync.Mutex{}
	for region := range dedicatedHostOnDemandData.Regions {
		for _, term := range DEDICATED_TERMS {
			for _, paymentOption := range DEDICATED_PAYMENT_OPTIONS {
				fg.Add(func() {
					loadDedicatedHostReservedData(
						region, regionsInverted, term, paymentOption, instances,
						instancesMu, false,
					)
				})
			}
		}
	}
	fg.Run()
}

const DEDICATED_HOST_ON_DEMAND_URL_CN = "https://calculator.amazonaws.cn/pricing/2.0/meteredUnitMaps/aws-cn/ec2/CNY/current/ec2-calc/{}/OnDemand/Dedicated/Linux/NA/No%20License%20required/Yes/index.json"

func addDedicatedHostPricingCn(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	log.Default().Println("Adding dedicated host pricing to EC2 (China)")
	instancesMu := &sync.Mutex{}

	// Get the reserved pricing data
	for region := range regionsInverted {
		// Get the on demand pricing
		onDemandFg := &utils.FunctionGroup{}
		onDemandFg.Add(func() {
			regionEncoded := url.PathEscape(region)
			url := strings.Replace(
				DEDICATED_HOST_ON_DEMAND_URL_CN,
				"{}",
				regionEncoded,
				1,
			)

			var dedicatedHostOnDemandData dedicatedHostOnDemandData
			err := awsutils.FetchDataFromAWSWebsite(url, &dedicatedHostOnDemandData)
			if err != nil {
				log.Fatalln("Failed to fetch dedicated host on demand data", err)
			}

			regionSlug := regionsInverted[region]
			instancesMu.Lock()
			for _, regionData := range dedicatedHostOnDemandData.Regions {
				for _, price := range regionData {
					for instanceType, instance := range instances {
						if dedicatedHostInstanceTypeMatches(instanceType, price.InstanceType) {
							addDedicatedHostOnDemandPrice(instance, regionSlug, price.Price)
						}
					}
				}
			}
			instancesMu.Unlock()
		})
		onDemandFg.Run()

		// Get the reserved pricing
		reservedFg := &utils.FunctionGroup{}
		for _, term := range DEDICATED_TERMS {
			for _, paymentOption := range DEDICATED_PAYMENT_OPTIONS {
				reservedFg.Add(func() {
					loadDedicatedHostReservedData(
						region, regionsInverted, term, paymentOption, instances,
						instancesMu, true,
					)
				})
			}
		}
		reservedFg.Run()
	}
}
