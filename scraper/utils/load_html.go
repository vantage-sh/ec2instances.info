package utils

import (
	"github.com/anaskhan96/soup"
)

// LoadHTML loads an HTML document from a URL and returns the root node.
//
// It shares the same bounded retry/backoff and tuned, connection-pooling client
// as the JSON loader (see http_retry.go), so transient network failures are
// absorbed rather than aborting the scrape.
func LoadHTML(url string) (*soup.Root, error) {
	body, err := FetchWithRetry(url, nil)
	if err != nil {
		return nil, err
	}

	val := soup.HTMLParse(string(body))
	if val.Error != nil {
		return nil, val.Error
	}

	return &val, nil
}
