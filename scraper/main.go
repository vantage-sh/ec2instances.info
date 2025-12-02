package main

import (
	"log"
	"os"
	"scraper/aws"
	"scraper/azure"
	"scraper/gcp"
	"scraper/utils"
	"slices"
	"strings"
)

func mustSet(key string) {
	if os.Getenv(key) == "" {
		log.Fatalf("%s must be set", key)
	}
}

func groupChecker() func(string) bool {
	onlyScrape := os.Getenv("ONLY_SCRAPE")
	if onlyScrape == "" {
		return func(_ string) bool { return true }
	}

	split := strings.Split(onlyScrape, ",")
	for i, s := range split {
		split[i] = strings.TrimSpace(s)
	}

	return func(group string) bool {
		return slices.Contains(split, group)
	}
}

func main() {
	var fg utils.FunctionGroup

	gc := groupChecker()

	if gc("aws") {
		mustSet("AWS_ACCESS_KEY_ID")
		mustSet("AWS_SECRET_ACCESS_KEY")
	}

	if gc("azure") {
		mustSet("AZURE_TENANT_ID")
		mustSet("AZURE_CLIENT_ID")
		mustSet("AZURE_CLIENT_SECRET")
		mustSet("AZURE_SUBSCRIPTION_ID")
	}

	if gc("gcp") {
		mustSet("GOOGLE_APPLICATION_CREDENTIALS")
		mustSet("GCP_PROJECT_ID")
	}

	addIf := func(toCheck string, fn func()) {
		if gc(toCheck) {
			fg.Add(fn)
		}
	}
	addIf("aws", aws.DoAwsScraping)
	addIf("azure", azure.DoAzureScraping)
	addIf("gcp", gcp.DoGCPScraping)

	fg.Run()
	log.Default().Println("All threads done! Everything seems fine! Exiting now!")
}
