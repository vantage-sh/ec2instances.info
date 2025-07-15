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

// LoadJson loads a JSON file from the given URL and unmarshals it into the given value.
func LoadJson(url string, val any) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute*15)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("status code %d for url %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	log.Default().Printf("Loaded %d bytes from %s", len(body), url)

	return json.Unmarshal(body, val)
}
