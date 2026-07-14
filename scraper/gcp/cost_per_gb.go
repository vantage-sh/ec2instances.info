package gcp

// CostPerGb describes the cost of attaching local SSD storage to an instance.
//
// Baseline is the number of GB of local SSD bundled with the instance at no
// extra storage charge (typically 0 for GCP, since local SSD is opt-in and
// charged per attached 375 GB disk; non-zero only for legacy machine types
// like *-lssd that include mandatory bundled disks).
//
// Regions maps region code -> rate. The rate is either a scalar float64
// (USD per GB-month, when on-demand and spot have the same rate) or a
// map[string]float64 keyed by platform ("ondemand", "spot") when the rates
// differ.
type CostPerGb struct {
	Baseline any            `json:"baseline"`
	Regions  map[string]any `json:"regions"`
}

// collapseUniform reduces a {platform: rate} map to either a scalar (when all
// platform rates are equal) or the original map encoded as map[string]any.
// An empty map collapses to 0.
func collapseUniform(m map[string]float64) any {
	if len(m) == 0 {
		return float64(0)
	}
	var first float64
	var firstSet bool
	uniform := true
	for _, v := range m {
		if !firstSet {
			first = v
			firstSet = true
			continue
		}
		if v != first {
			uniform = false
			break
		}
	}
	if uniform {
		return first
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
