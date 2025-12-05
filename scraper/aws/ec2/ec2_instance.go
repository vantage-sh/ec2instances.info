package ec2

import (
	"encoding/json"
	"scraper/aws/ec2/extras"
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
	MemorySpeed              *int                  `json:"memory_speed"`
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
	CoremarkIterationsSecond *float64              `json:"coremark_iterations_second,omitempty"`
	GPUArchitectures         []string              `json:"gpu_architectures,omitempty"`
	GPUCurrentTempAvgCelsius *float64              `json:"gpu_current_temp_avg_celsius,omitempty"`
	FFmpegUsedCuda           *bool                 `json:"ffmpeg_used_cuda,omitempty"`
	FFmpegSpeed              *float64              `json:"ffmpeg_speed,omitempty"`
	FFmpegFPS                *float64              `json:"ffmpeg_fps,omitempty"`
	GPUPowerDrawWattsAvg     *int                  `json:"gpu_power_draw_watts_avg,omitempty"`
	GPUClocks                []extras.GPUClocks    `json:"gpu_clocks,omitempty"`
	NumaNodeCount            *int                  `json:"numa_node_count,omitempty"`
	UsesNumaArchitecture     *bool                 `json:"uses_numa_architecture,omitempty"`
	MaxNumaDistance          *int                  `json:"max_numa_distance,omitempty"`
	CoreCountPerNumaNode     *float64              `json:"core_count_per_numa_node,omitempty"`
	ThreadCountPerNumaNode   *float64              `json:"thread_count_per_numa_node,omitempty"`
	MemoryPerNumaNodeMB      *float64              `json:"memory_per_numa_node_mb,omitempty"`
	L3PerNumaNodeMB          *float64              `json:"l3_per_numa_node_mb,omitempty"`
	L3Shared                 *bool                 `json:"l3_shared,omitempty"`
}

func avg(ints []int) *float64 {
	if len(ints) == 0 {
		return nil
	}
	sum := 0
	for _, v := range ints {
		sum += v
	}
	avg := float64(sum) / float64(len(ints))
	return &avg
}

func (instance *EC2Instance) addExtraDetails() {
	if details, ok := extras.ExtraInstanceDetails[instance.InstanceType]; ok {
		instance.MemorySpeed = details.Memory.SpeedMhz
		instance.CoremarkIterationsSecond = &details.Coremark.IterationsSecond
		gpuArchitectures := []string{}
		gpuTemps := []int{}
		gpuPowerDraws := []int{}
		gpuClocks := []extras.GPUClocks{}
		for _, gpu := range details.NvidiaGPUs {
			gpuArchitectures = append(gpuArchitectures, gpu.Architecture)
			gpuTemps = append(gpuTemps, gpu.Temp.CurrentTempCelsius)
			gpuPowerDraws = append(gpuPowerDraws, gpu.Power.AveragePowerDrawWatts)
			gpuClocks = append(gpuClocks, gpu.Clocks)
		}
		if len(gpuTemps) > 0 {
			sum := 0
			for _, t := range gpuTemps {
				sum += t
			}
			avg := float64(sum) / float64(len(gpuTemps))
			instance.GPUCurrentTempAvgCelsius = &avg
		}
		if len(gpuPowerDraws) > 0 {
			sum := 0
			for _, p := range gpuPowerDraws {
				sum += p
			}
			avg := sum / len(gpuPowerDraws)
			instance.GPUPowerDrawWattsAvg = &avg
		}
		instance.GPUArchitectures = gpuArchitectures
		instance.GPUClocks = gpuClocks
		if details.FfMpeg != nil {
			instance.FFmpegUsedCuda = &details.FfMpeg.CudaUsed
			instance.FFmpegSpeed = &details.FfMpeg.Speed
			instance.FFmpegFPS = &details.FfMpeg.FPS
		}
		instance.UsesNumaArchitecture = &details.NUMA.IsNuma
		if details.NUMA.IsNuma {
			instance.NumaNodeCount = &details.NUMA.NumaNodeCount
			instance.MaxNumaDistance = &details.NUMA.MaxNumaDistance
			instance.CoreCountPerNumaNode = avg(details.NUMA.NumaNodeCoreCounts)
			instance.ThreadCountPerNumaNode = avg(details.NUMA.NumaNodeThreadCounts)
			instance.MemoryPerNumaNodeMB = avg(details.NUMA.MemoryPerNodeMB)
			instance.L3PerNumaNodeMB = avg(details.NUMA.L3PerNodeMB)
			instance.L3Shared = &details.NUMA.L3Shared
		}
	}
}
