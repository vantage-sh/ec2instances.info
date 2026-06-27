package azure

import (
	"encoding/json"
	"log"
	"net/url"
	"os"
	"scraper/utils"
)

func getAzureAccessToken() string {
	tenantId := os.Getenv("AZURE_TENANT_ID")
	clientId := os.Getenv("AZURE_CLIENT_ID")
	clientSecret := os.Getenv("AZURE_CLIENT_SECRET")

	body := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {clientId},
		"client_secret": {clientSecret},
		"scope":         {"https://management.azure.com/.default"},
	}
	url := "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token"

	respBody, err := utils.PostFormWithRetry(url, body)
	if err != nil {
		log.Fatal("Failed to get Azure access token: ", err)
	}

	type justToken struct {
		AccessToken string `json:"access_token"`
	}
	var token justToken
	if err := json.Unmarshal(respBody, &token); err != nil {
		log.Fatal("Failed to decode Azure access token: ", err)
	}

	return token.AccessToken
}
