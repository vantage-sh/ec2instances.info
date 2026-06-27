package awsutils

import (
	"encoding/json"
	"regexp"
	"scraper/utils"
	"strings"
)

var ROUGHLY_JS_KEY = regexp.MustCompile(`(\w+):`)

// FetchDataFromAWSWebsite fetches data from an AWS website and unmarshals it into a struct.
//
// The fetch routes through utils.FetchWithRetry so transient failures (e.g. the
// TLS handshake timeout seen on the spot-advisor endpoint) are retried with
// backoff instead of aborting the whole scrape.
func FetchDataFromAWSWebsite(url string, v any) error {
	body, err := utils.FetchWithRetry(url, nil)
	if err != nil {
		return err
	}

	err = json.Unmarshal(body, v)
	if err != nil {
		// Try looking for the first usage of "callback(" and the last usage of ")"
		bodyStr := string(body)
		callbackStart := strings.Index(bodyStr, "callback(")
		callbackEnd := strings.LastIndex(bodyStr, ")")
		if callbackStart == -1 || callbackEnd == -1 {
			return err
		}
		body = []byte(ROUGHLY_JS_KEY.ReplaceAllString(bodyStr[callbackStart+9:callbackEnd], `"$1":`))
		err = json.Unmarshal(body, v)
		if err != nil {
			return err
		}
	}
	return nil
}
