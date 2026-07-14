package azure

type CostPerGb struct {
	Baseline any            `json:"baseline"`
	Regions  map[string]any `json:"regions"`
}
