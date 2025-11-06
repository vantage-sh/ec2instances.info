package main

import (
	"log"
	"os"
	"scraper/aws"
	"scraper/azure"
	"scraper/utils"
)

func mustSet(key string) {
	if os.Getenv(key) == "" {
		log.Fatalf("%s must be set", key)
	}
}

func main() {
	var fg utils.FunctionGroup

	mustSet("AWS_ACCESS_KEY_ID")
	mustSet("AWS_SECRET_ACCESS_KEY")
	mustSet("AZURE_TENANT_ID")
	mustSet("AZURE_CLIENT_ID")
	mustSet("AZURE_CLIENT_SECRET")
	mustSet("AZURE_SUBSCRIPTION_ID")

	fg.Add(aws.DoAwsScraping)
	fg.Add(azure.DoAzureScraping)

	fg.Run()
	log.Default().Println("All threads done! Everything seems fine! Exiting now!")
}
