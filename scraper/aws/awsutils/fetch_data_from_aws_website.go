package awsutils

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

var ROUGHLY_JS_KEY = regexp.MustCompile(`(\w+):`)

// FetchDataFromAWSWebsite fetches data from an AWS website and unmarshals it into a struct
func FetchDataFromAWSWebsite(url string, v any) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to fetch data from AWS website: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
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
