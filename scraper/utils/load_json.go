package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// LoadJsonWithBearerToken loads a JSON file from the given URL and unmarshals it into the given value.
// If the bearer token is nil, it will not be added to the request.
func LoadJsonWithBearerToken(url string, val any, bearerToken *string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute*15)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	if bearerToken != nil {
		req.Header.Set("Authorization", "Bearer "+*bearerToken)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Errorf("status code %d for url %s: %w", resp.StatusCode, url, err)
		}
		return fmt.Errorf("status code %d for url %s: %s", resp.StatusCode, url, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	log.Default().Printf("Loaded %d bytes from %s", len(body), url)

	return json.Unmarshal(body, val)
}

// LoadJson loads a JSON file from the given URL and unmarshals it into the given value.
func LoadJson(url string, val any) error {
	return LoadJsonWithBearerToken(url, val, nil)
}
