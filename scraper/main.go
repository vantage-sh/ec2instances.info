package main

import (
	"log"
	"os"
	"scraper/aws"
	"scraper/azure"
	"scraper/gcp"
	"scraper/utils"
	"strings"
)

func mustSet(key string) {
	if os.Getenv(key) == "" {
		log.Fatalf("%s must be set", key)
	}
}

func checkServiceAllowed() func(string) bool {
	allowedServices := os.Getenv("ALLOWED_SERVICES")
	if allowedServices == "" {
		return func(string) bool { return true }
	}
	allowed := strings.Split(allowedServices, ",")
	allowedSet := make(map[string]struct{})
	for _, service := range allowed {
		allowedSet[service] = struct{}{}
	}
	return func(service string) bool {
		_, ok := allowedSet[service]
		return ok
	}
}

func main() {
	var fg utils.FunctionGroup

	allowed := checkServiceAllowed()

	if allowed("aws") {
		mustSet("AWS_ACCESS_KEY_ID")
		mustSet("AWS_SECRET_ACCESS_KEY")
	}
	if allowed("azure") {
		mustSet("AZURE_TENANT_ID")
		mustSet("AZURE_CLIENT_ID")
		mustSet("AZURE_CLIENT_SECRET")
		mustSet("AZURE_SUBSCRIPTION_ID")
	}
	if allowed("gcp") {
		mustSet("GCP_PROJECT_ID")
		mustSet("GCP_CLIENT_EMAIL")
		mustSet("GCP_PRIVATE_KEY")
	}

	runIfAllowed := func(service string, fn func()) {
		if allowed(service) {
			fg.Add(fn)
		} else {
			log.Printf("Skipping %s scraping as it's not in the allowed list\n", service)
		}
	}
	runIfAllowed("aws", aws.DoAwsScraping)
	runIfAllowed("azure", azure.DoAzureScraping)
	runIfAllowed("gcp", gcp.DoGCPScraping)

	fg.Run()
	log.Default().Println("All threads done! Everything seems fine! Exiting now!")
}
