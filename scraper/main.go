package main

import (
	"log"
	"os"
	"scraper/aws"
	"scraper/azure"
	"scraper/utils"
)

func main() {
	var fg utils.FunctionGroup

	if os.Getenv("AWS_ACCESS_KEY_ID") == "" || os.Getenv("AWS_SECRET_ACCESS_KEY") == "" {
		log.Fatal("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set")
	}

	fg.Add(aws.DoAwsScraping)
	fg.Add(azure.DoAzureScraping)

	fg.Run()
}
