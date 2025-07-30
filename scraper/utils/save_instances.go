package utils

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// SaveInstances saves the instances to a file
func SaveInstances(sortedInstances any, fp string) {
	json, err := json.MarshalIndent(sortedInstances, "", " ")
	if err != nil {
		log.Fatal(err)
	}
	jsonS, err := strconv.Unquote(strings.ReplaceAll(strconv.Quote(string(json)), `\\u`, `\u`))
	if err != nil {
		log.Fatal(err)
	}

	err = os.MkdirAll(filepath.Dir(fp), 0777)
	if err != nil {
		log.Fatal(err)
	}

	WriteAndCompressFile(fp, []byte(jsonS))
}
