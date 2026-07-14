package ec2

// CostPerGb expresses storage cost separately from compute.
//
// Baseline is the bundled storage capacity (in GB) included with the instance.
// Regions maps region codes to per-GB overage rates when applicable.
//
// For EC2 instance store, there is no per-GB overage rate, so Regions is
// always an empty map (serialized as "{}", never null).
//
// TODO: This local definition can be unified with the AWS-package-level
// type in scraper/aws/storage_pricing.go once that file exists; the JSON
// shape is identical.
type CostPerGb struct {
	Baseline any            `json:"baseline"`
	Regions  map[string]any `json:"regions"`
}
