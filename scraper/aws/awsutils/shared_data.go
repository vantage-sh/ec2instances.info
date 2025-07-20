package awsutils

var LEASES = map[string]string{
	"1yr": "yrTerm1",
	"3yr": "yrTerm3",
}

var PURCHASE_OPTIONS = map[string]string{
	"All Upfront":        "allUpfront",
	"AllUpfront":         "allUpfront",
	"Partial Upfront":    "partialUpfront",
	"PartialUpfront":     "partialUpfront",
	"No Upfront":         "noUpfront",
	"NoUpfront":          "noUpfront",
	"Light Utilization":  "lightUtilization",
	"Medium Utilization": "mediumUtilization",
	"Heavy Utilization":  "heavyUtilization",
}
