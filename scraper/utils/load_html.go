package utils

import (
	"io"
	"net/http"

	"github.com/anaskhan96/soup"
)

// LoadHTML loads an HTML document from a URL and returns the root node
func LoadHTML(url string) (*soup.Root, error) {
	resp, err := http.Get(url)
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
