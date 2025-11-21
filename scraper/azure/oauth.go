package azure

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
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

	resp, err := http.PostForm(url, body)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		b, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Fatal("Failed to read Azure access token response: ", err)
		}
		log.Fatal("Failed to get Azure access token: ", string(b))
	}

	type justToken struct {
		AccessToken string `json:"access_token"`
	}
	var token justToken
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		log.Fatal("Failed to decode Azure access token: ", err)
	}

	return token.AccessToken
}
