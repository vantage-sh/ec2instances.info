package ec2

import (
	"log"
	"scraper/utils"
	"strconv"
	"strings"

	"github.com/anaskhan96/soup"
)

func float64Ptr(f float64) *float64 {
	return &f
}

func processT2Row(instance *EC2Instance, childText string) {
	credsPerHourFloat, err := strconv.ParseFloat(childText, 64)
	if err != nil {
		log.Fatalln("Failed to parse T2 credits per hour", childText)
	}
	instance.BasePerformance = float64Ptr(credsPerHourFloat / 60)
	instance.BurstMinutes = float64Ptr(credsPerHourFloat * 24 / float64(instance.VCPU.Value()))
}

func getT2Html() *soup.Root {
	t2Url := "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html"
	doc, err := utils.LoadHTML(t2Url)
	if err != nil {
		log.Fatalln("Failed to load T2 credits HTML", err)
	}
	return doc
}

func addT2Credits(instances map[string]*EC2Instance, t2HtmlGetter func() *soup.Root) {
	log.Default().Println("Adding T2 credits to EC2")

	doc := t2HtmlGetter()
	tableContainers := doc.FindAll("div", "class", "table-contents")
	if len(tableContainers) < 2 {
		log.Fatalln("Failed to find T2 credits table containers")
	}
	if tableContainers[1].Error != nil {
		log.Fatalln("Failed to load T2 credits table container")
	}
	tables := tableContainers[1].Find("table")
	if tables.Error != nil {
		log.Fatalln("Failed to find T2 credits table")
	}

	tbody := tables.Find("tbody")
	if tbody.Error != nil {
		log.Fatalln("Failed to find T2 credits tbody")
	}

	rows := tbody.FindAll("tr")
	if len(rows) == 0 {
		log.Fatalln("Failed to find T2 credits rows")
	}

	for _, row := range rows {
		children := row.FindAll("td")
		var firstNodeText string

		childrenHtml := make([]string, len(children))
		for i, child := range children {
			childrenHtml[i] = child.HTML()
		}

		if len(children) > 1 {
			firstNodeText = toText(children[0])
			instance := instances[firstNodeText]
			if instance == nil {
				if strings.Contains(firstNodeText, ".") {
					utils.SendWarning("T2 credits data has unknown instance type", firstNodeText)
				}
			} else {
				childText := toText(children[1])
				if childText == "" {
					utils.SendWarning("T2 credits data has empty row", firstNodeText)
				} else {
					processT2Row(instance, childText)
				}
			}
		}
	}
}
