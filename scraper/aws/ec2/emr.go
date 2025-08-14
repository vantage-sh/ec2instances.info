package ec2

import (
	"log"
	"regexp"
	"scraper/aws/awsutils"
	"scraper/utils"
	"strings"

	"github.com/anaskhan96/soup"
)

type emrPrice struct {
	Price string `json:"price"`
}

type emrData struct {
	Regions map[string]map[string]emrPrice `json:"regions"`
}

var EMR_PRICE_REGEX = regexp.MustCompile(`\d+\.\d+`)

func addEmrPricingCn(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	log.Default().Println("Adding EMR pricing to EC2 (China)")

	doc, err := utils.LoadHTML("https://www.amazonaws.cn/en/elasticmapreduce/pricing/")
	if err != nil {
		log.Fatalln("Failed to fetch EMR pricing data", err)
	}

	for regionName, regionSlug := range regionsInverted {
		nameFormatting := strings.ReplaceAll(
			regionName,
			" ",
			"_",
		)
		nameFormatting = strings.ReplaceAll(
			nameFormatting,
			"(",
			".28",
		)
		nameFormatting = strings.ReplaceAll(
			nameFormatting,
			")",
			".29",
		)

		h2 := doc.Find("h2", "id", nameFormatting+"_Region")
		if h2.Error != nil {
			continue
		}

		// Find the item after it that has the class "lb-tbl"
		var tableContainer *soup.Root = &h2
		for {
			table1 := tableContainer.FindNextElementSibling()
			if table1.Error != nil {
				tableContainer = nil
				break
			}
			tableContainer = &table1
			if strings.Contains(tableContainer.Attrs()["class"], "lb-tbl") {
				break
			}
		}

		if tableContainer == nil {
			continue
		}

		table := tableContainer.Find("table")
		if table.Error != nil {
			continue
		}

		tbody := table.Find("tbody")
		if tbody.Error != nil {
			continue
		}

		trs := tbody.FindAll("tr")
		if len(trs) < 2 {
			continue
		}
		trs = trs[1:]

		for _, tr := range trs {
			tds := tr.FindAll("td")
			if len(tds) < 3 {
				continue
			}
			instanceType := tds[0].FullText()
			priceString := tds[2].FullText()

			// Find the float in the price string
			matches := EMR_PRICE_REGEX.FindStringSubmatch(priceString)
			if len(matches) == 0 {
				continue
			}
			price := matches[0]

			instance := instances[instanceType]
			if instance == nil {
				utils.SendWarning("EMR pricing data has unknown instance type", instanceType)
				continue
			}
			regionPricing := instance.Pricing[regionSlug]
			if regionPricing == nil {
				regionPricing = make(map[OS]any)
				instance.Pricing[regionSlug] = regionPricing
			}
			regionPricing["emr"] = &EC2PricingData{
				EMR: price,
			}
			instance.EMR = true
		}
	}
}

const EMR_INSTANCE_TYPE_PREFIX = "Instance-instancetype-"

func addEmrPricingUs(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	log.Default().Println("Adding EMR pricing to EC2 (other regions)")

	var emrData emrData
	err := awsutils.FetchDataFromAWSWebsite(
		"https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/elasticmapreduce/USD/current/elasticmapreduce.json",
		&emrData,
	)
	if err != nil {
		log.Fatalln("Failed to fetch EMR pricing data", err)
	}

	for regionName, instanceTypes := range emrData.Regions {
		var regions []string
		if regionName == "AWS GovCloud (US)" {
			// Special case for GovCloud
			regions = []string{"us-gov-west-1", "us-gov-east-1"}
		} else {
			// Generally just one region
			region := regionsInverted[regionName]
			if region == "" {
				// This includes weird stuff sometimes. Probably fine.
				continue
			}
			regions = []string{region}
		}

		for priceId, price := range instanceTypes {
			if strings.HasPrefix(priceId, EMR_INSTANCE_TYPE_PREFIX) {
				instanceType := priceId[len(EMR_INSTANCE_TYPE_PREFIX):]
				instance := instances[instanceType]
				if instance == nil {
					utils.SendWarning("EMR pricing data has unknown instance type", instanceType)
					continue
				}
				for _, region := range regions {
					pricingData := instance.Pricing[region]
					if pricingData == nil {
						pricingData = make(map[OS]any)
						instance.Pricing[region] = pricingData
					}
					pricingData["emr"] = &EC2PricingData{
						EMR: price.Price,
					}
					instance.EMR = true
				}
			}
		}
	}
}
