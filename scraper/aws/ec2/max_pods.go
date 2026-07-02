package ec2

import (
	"bytes"
	"fmt"
	"log"
	"scraper/utils"
	"strconv"
	"strings"
)

const minExpectedEniMaxPodsEntries = 1000 // sanity floor
const eniMaxPodsURL = "https://raw.githubusercontent.com/aws/amazon-vpc-cni-k8s/master/misc/eni-max-pods.txt"

func parseMaxPodsTable(doc []byte) map[string]int {
	instancesToPods := make(map[string]int)
	for line := range bytes.SplitSeq(doc, []byte("\n")) {
		if bytes.Contains(line, []byte("#")) {
			continue
		}
		instanceAndPods := bytes.Split(line, []byte(" "))
		if len(instanceAndPods) != 2 {
			continue
		}
		pods, err := strconv.Atoi(string(instanceAndPods[1]))
		if err != nil {
			continue
		}
		instancesToPods[string(instanceAndPods[0])] = pods
	}
	return instancesToPods
}

func validateMaxPodsCount(n int) error {
	if n == 0 {
		return fmt.Errorf("parsed zero eni-max-pods entries")
	}
	if n < minExpectedEniMaxPodsEntries {
		return fmt.Errorf("parsed only %d eni-max-pods entries, expected at least %d", n, minExpectedEniMaxPodsEntries)
	}
	return nil
}

func fetchMaxPods() (map[string]int, error) {
	resp, err := utils.FetchWithRetry(eniMaxPodsURL, nil)
	if err != nil {
		return nil, err
	}

	instancesToPods := parseMaxPodsTable(resp)

	if err := validateMaxPodsCount(len(instancesToPods)); err != nil {
		return nil, err
	}

	return instancesToPods, nil
}

func addMaxPodsInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding EKS max pods to EC2")

	maxPods, err := fetchMaxPods()
	if err != nil {
		log.Fatalln("Failed to fetch EKS max pods data:", err)
	}

	matched := 0
	for instanceName, instance := range instances {
		if pods, ok := maxPods[strings.ToLower(instanceName)]; ok {
			instance.MaxPods = &pods
			matched++
		}
	}

	if matched == 0 {
		log.Fatalln("Zero instances matched EKS max pods data; entries:", len(maxPods))
	}

	log.Default().Printf("Merged EKS max pods into %d instances (of %d entries)", matched, len(maxPods))
}
