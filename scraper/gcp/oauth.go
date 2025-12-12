package gcp

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// GCP OAuth2 token endpoint
const gcpTokenURL = "https://oauth2.googleapis.com/token"

// JWT Header for GCP
type jwtHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

// JWT Claims for GCP service account
type jwtClaims struct {
	Iss   string `json:"iss"`
	Scope string `json:"scope"`
	Aud   string `json:"aud"`
	Iat   int64  `json:"iat"`
	Exp   int64  `json:"exp"`
}

// Token response from GCP
type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

var cachedToken string
var tokenExpiry time.Time

// getGCPAccessToken returns an OAuth2 access token for GCP APIs
func getGCPAccessToken() string {
	// Check if we have a valid cached token
	if cachedToken != "" && time.Now().Before(tokenExpiry) {
		return cachedToken
	}

	clientEmail := os.Getenv("GCP_CLIENT_EMAIL")
	privateKey := os.Getenv("GCP_PRIVATE_KEY")

	if clientEmail == "" || privateKey == "" {
		log.Fatal("GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY must be set")
	}

	// Create JWT
	now := time.Now()
	header := jwtHeader{
		Alg: "RS256",
		Typ: "JWT",
	}

	claims := jwtClaims{
		Iss:   clientEmail,
		Scope: "https://www.googleapis.com/auth/compute.readonly https://www.googleapis.com/auth/cloud-billing.readonly",
		Aud:   gcpTokenURL,
		Iat:   now.Unix(),
		Exp:   now.Add(time.Hour).Unix(),
	}

	// Encode header and claims
	headerJSON, err := json.Marshal(header)
	if err != nil {
		log.Fatal("Failed to marshal JWT header:", err)
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		log.Fatal("Failed to marshal JWT claims:", err)
	}

	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)
	claimsB64 := base64.RawURLEncoding.EncodeToString(claimsJSON)

	signInput := headerB64 + "." + claimsB64

	// Parse private key - handle escaped newlines from env var
	privateKey = strings.ReplaceAll(privateKey, "\\n", "\n")

	block, _ := pem.Decode([]byte(privateKey))
	if block == nil {
		log.Fatal("Failed to decode PEM block from private key")
	}

	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		// Try PKCS1 format as fallback
		key, err = x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			log.Fatal("Failed to parse private key:", err)
		}
	}

	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		log.Fatal("Private key is not RSA")
	}

	// Sign the JWT
	hash := sha256.Sum256([]byte(signInput))
	signature, err := rsa.SignPKCS1v15(nil, rsaKey, crypto.SHA256, hash[:])
	if err != nil {
		log.Fatal("Failed to sign JWT:", err)
	}

	signatureB64 := base64.RawURLEncoding.EncodeToString(signature)
	jwt := signInput + "." + signatureB64

	// Exchange JWT for access token
	form := url.Values{
		"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"},
		"assertion":  {jwt},
	}

	resp, err := http.PostForm(gcpTokenURL, form)
	if err != nil {
		log.Fatal("Failed to request access token:", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Fatalf("Failed to get access token (status %d): %s", resp.StatusCode, string(body))
	}

	var token tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		log.Fatal("Failed to decode token response:", err)
	}

	// Cache the token (with 5 minute buffer before expiry)
	cachedToken = token.AccessToken
	tokenExpiry = now.Add(time.Duration(token.ExpiresIn-300) * time.Second)

	return cachedToken
}

// makeGCPAuthenticatedRequest makes an authenticated request to a GCP API
func makeGCPAuthenticatedRequest(url string, result interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	token := getGCPAccessToken()
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	return json.NewDecoder(resp.Body).Decode(result)
}
