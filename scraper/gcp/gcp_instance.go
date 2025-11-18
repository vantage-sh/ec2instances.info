package gcp

import (
	"encoding/json"
	"strconv"
)

type Region = string
type OS = string

type Price float64

func (p *Price) MarshalJSON() ([]byte, error) {
	s := strconv.FormatFloat(float64(*p), 'f', -1, 64)
	return []byte(`"` + s + `"`), nil
}

func (p *Price) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return err
	}
	*p = Price(f)
	return nil
}

// GCPPricingData represents pricing information for a GCP instance in a region
type GCPPricingData struct {
	OnDemand string `json:"ondemand,omitempty"`
	Spot     string `json:"spot,omitempty"`
}

// GCPInstance represents a GCP Compute Engine instance type in AWS instance format
type GCPInstance struct {
	InstanceType       string                `json:"instance_type"`
	Family             string                `json:"family"`
	VCPU               int                   `json:"vCPU"`
	Memory             float64               `json:"memory"`
	PrettyName         string                `json:"pretty_name"`
	NetworkPerformance string                `json:"network_performance"`
	Generation         string                `json:"generation"`
	GPU                float64               `json:"GPU"`
	GPUModel           *string               `json:"GPU_model,omitempty"`
	GPUMemory          int                   `json:"GPU_memory,omitempty"`
	Pricing            map[Region]map[OS]any `json:"pricing"`
	Regions            map[string]string     `json:"regions"`
	AvailabilityZones  map[string][]string   `json:"availability_zones,omitempty"`
	LocalSSD           bool                  `json:"local_ssd"`
	LocalSSDSize       int                   `json:"local_ssd_size,omitempty"`
	SharedCPU          bool                  `json:"shared_cpu"`
	ComputeOptimized   bool                  `json:"compute_optimized,omitempty"`
	MemoryOptimized    bool                  `json:"memory_optimized,omitempty"`
	AcceleratorType    string                `json:"accelerator_type,omitempty"`
}
