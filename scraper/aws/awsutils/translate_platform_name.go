package awsutils

import (
	"scraper/utils"
	"strings"
)

var OS_MAP = map[string]string{
	"Linux":                            "linux",
	"RHEL":                             "rhel",
	"Red Hat Enterprise Linux with HA": "rhel",
	"SUSE":                             "sles",
	"Windows":                          "mswin",
	"Ubuntu Pro":                       "ubuntu",
	"Ubuntu Pro Linux":                 "ubuntu",
	// Spot products
	"Linux/UNIX":                            "linux",
	"Red Hat Enterprise Linux":              "rhel",
	"Red Hat Enterprise Linux (Amazon VPC)": "rhel",
	"SUSE Linux":                            "sles",
	"NA":                                    "",
}

var SOFTWARE_MAP = map[string]string{
	"NA":      "",
	"SQL Std": "SQL",
	"SQL Web": "SQLWeb",
	"SQL Ent": "SQLEnterprise",
}

// TranslatePlatformName translates the platform name from the AWS API data to the platform name used in the EC2 instance data
func TranslatePlatformName(operatingSystem string, preinstalledSoftware string) string {
	osValue, ok := OS_MAP[operatingSystem]
	if !ok {
		osValue = "unknown"
	}
	softwareValue, ok := SOFTWARE_MAP[preinstalledSoftware]
	if !ok {
		softwareValue = "unknown"
	}

	if osValue == "" && softwareValue == "" {
		return ""
	}

	val := osValue + softwareValue
	if strings.Contains(val, "unknown") {
		utils.SendWarning("Unknown platform", operatingSystem, preinstalledSoftware)
		return ""
	}
	return val
}
