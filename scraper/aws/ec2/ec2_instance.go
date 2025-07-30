package ec2

import (
	"encoding/json"
	"strconv"
)

type VPC struct {
	MaxENIs   int `json:"max_enis"`
	IPsPerENI int `json:"ips_per_eni"`
}

type Region = string

type OS = string

type Price float64

func (p *Price) MarshalJSON() ([]byte, error) {
	dp := formatPrice(float64(*p))
	return []byte(`"` + dp + `"`), nil
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

type EC2PricingData struct {
	OnDemand     string             `json:"ondemand,omitempty"`
	Reserved     *map[string]string `json:"reserved,omitempty"`
	SpotMin      *Price             `json:"spot_min,omitempty"`
	SpotMax      *Price             `json:"spot_max,omitempty"`
	EMR          string             `json:"emr,omitempty"`
	PCTInterrupt string             `json:"pct_interrupt,omitempty"`
	PCTSavingsOD *int               `json:"pct_savings_od,omitempty"`
	SpotAvg      Price              `json:"spot_avg,omitempty"`

	spot []Price
}

type Storage struct {
	SSD                       bool   `json:"ssd"`
	TrimSupport               bool   `json:"trim_support"`
	NVMeSSD                   bool   `json:"nvme_ssd"`
	StorageNeedsInitalization bool   `json:"storage_needs_initialization"`
	IncludesSwapPartition     bool   `json:"includes_swap_partition"`
	Devices                   int    `json:"devices"`
	Size                      int    `json:"size"`
	SizeUnit                  string `json:"size_unit"`
}

type EC2Instance struct {
	InstanceType             string                `json:"instance_type"`
	Family                   string                `json:"family"`
	VCPU                     int                   `json:"vCPU"`
	Memory                   float64               `json:"memory"`
	PrettyName               string                `json:"pretty_name"`
	Arch                     []string              `json:"arch"`
	NetworkPerformance       string                `json:"network_performance"`
	PhysicalProcessor        string                `json:"physical_processor"`
	Generation               string                `json:"generation"`
	GPU                      float64               `json:"GPU"`
	FPGA                     int                   `json:"FPGA"`
	EBSAsNVMe                bool                  `json:"ebs_as_nvme"`
	VPC                      *VPC                  `json:"vpc"`
	EBSOptimized             bool                  `json:"ebs_optimized"`
	EBSBaselineThroughput    float64               `json:"ebs_baseline_throughput"`
	EBSBaselineIOPS          int                   `json:"ebs_baseline_iops"`
	EBSBaselineBandwidth     int                   `json:"ebs_baseline_bandwidth"`
	EBSThroughput            float64               `json:"ebs_throughput"`
	EBSIOPS                  int                   `json:"ebs_iops"`
	EBSMaxBandwidth          int                   `json:"ebs_max_bandwidth"`
	ECU                      float64               `json:"ECU"`
	IntelAVX512              *bool                 `json:"intel_avx512"`
	IntelAVX2                *bool                 `json:"intel_avx2"`
	IntelAVX                 *bool                 `json:"intel_avx"`
	IntelTurbo               *bool                 `json:"intel_turbo"`
	ClockSpeedGhz            *string               `json:"clock_speed_ghz"`
	EnhancedNetworking       bool                  `json:"enhanced_networking"`
	Pricing                  map[Region]map[OS]any `json:"pricing"` // any is *EC2PricingData or string
	Regions                  map[string]string     `json:"regions"`
	LinuxVirtualizationTypes []string              `json:"linux_virtualization_types"`
	VpcOnly                  bool                  `json:"vpc_only"`
	BasePerformance          *float64              `json:"base_performance"`
	BurstMinutes             *float64              `json:"burst_minutes"`
	GPUModel                 *string               `json:"GPU_model"`
	ComputeCapability        float64               `json:"compute_capability"`
	GPUMemory                int                   `json:"GPU_memory"`
	PlacementGroupSupport    bool                  `json:"placement_group_support"`
	AvailabilityZones        map[string][]string   `json:"availability_zones"`
	Storage                  *Storage              `json:"storage"`
	EMR                      bool                  `json:"emr"`
	IPV6Support              bool                  `json:"ipv6_support"`
}
