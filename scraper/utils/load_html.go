package utils

import (
	"context"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/anaskhan96/soup"
)

func tryWith2MinTimeout(url string) (*soup.Root, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	val := soup.HTMLParse(string(body))
	if val.Error != nil {
		return nil, val.Error
	}

	return &val, nil
}

// LoadHTML loads an HTML document from a URL and returns the root node
func LoadHTML(url string) (*soup.Root, error) {
	tries := 0
	var val *soup.Root
	var err error
	for tries < 3 {
		val, err = tryWith2MinTimeout(url)
		if err == nil {
			return val, nil
		}
		tries++
		time.Sleep(10 * time.Second)
		log.Printf("Failed to load HTML from %s, retrying... (try %d)", url, tries)
	}
	return nil, err
}
