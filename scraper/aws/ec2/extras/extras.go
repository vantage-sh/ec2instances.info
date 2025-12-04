package extras

import (
	_ "embed"
	"encoding/json"
	"time"

	"github.com/zcalusic/sysinfo"
)

//go:embed manually_fetched_data.json
var extrasJSON []byte

type CoremarkMetrics struct {
	TotalTicks       int64   `json:"total_ticks"`
	IterationsSecond float64 `json:"iterations_second"`
	TotalTimeSeconds float64 `json:"total_time_seconds"`
}

type FfmpegMetrics struct {
	FPS                float64 `json:"fps"`
	ElapsedTimeSeconds float64 `json:"elapsed_time_seconds"`
	Speed              float64 `json:"speed"`
	AACQAvg            float64 `json:"aac_qavg"`
	CudaUsed           bool    `json:"cuda_used"`
}

type GPUClocks struct {
	GraphicsClockMHz int `json:"graphics_clock_mhz"`
	SMClockMHz       int `json:"sm_clock_mhz"`
	MemoryClockMHz   int `json:"memory_clock_mhz"`
	VideoClockMHz    int `json:"video_clock_mhz"`
}

type GPULinkWidth struct {
	CurrentLinkWidth string `json:"current_link_width"`
	MaximumLinkWidth string `json:"maximum_link_width"`
}

type GPUTemp struct {
	CurrentTempCelsius      int  `json:"current_temp_celsius"`
	MaxOperatingTempCelsius *int `json:"max_operating_temp_celsius"`
}

type GPUPower struct {
	AveragePowerDrawWatts  int `json:"average_power_draw_watts"`
	CurrentPowerLimitWatts int `json:"current_power_limit_watts"`
	PowerLimitWatts        int `json:"power_limit_watts"`
}

type NvidiaGPU struct {
	Architecture string       `json:"architecture"`
	Name         string       `json:"name"`
	Clocks       GPUClocks    `json:"clocks"`
	LinkWidth    GPULinkWidth `json:"link_width"`
	Temp         GPUTemp      `json:"temp"`
	Power        GPUPower     `json:"power"`
	Memory       int          `json:"memory"`
}

type Memory struct {
	TotalMB  uint `json:"total_mb"`
	SpeedMhz *int `json:"speed_mhz"`
}

type NUMA struct {
	NumaNodeCount        int     `json:"numa_node_count"`
	IsNuma               bool    `json:"is_numa"`
	NumaNodeCoreCounts   []int   `json:"numa_node_core_counts"`
	NumaNodeThreadCounts []int   `json:"numa_node_thread_counts"`
	MemoryPerNodeMB      []int   `json:"memory_per_numa_node_mb"`
	NodeDistances        [][]int `json:"node_distances"`
	MaxNumaDistance      int     `json:"max_numa_distance"`
	L3PerNodeMB          []int   `json:"l3_cache_per_numa_node_mb"`
	L3Shared             bool    `json:"l3_shared"`
	IsBalanced           bool    `json:"is_balanced"`
}

type InstanceDetails struct {
	RanAt      time.Time       `json:"ran_at"`
	Coremark   CoremarkMetrics `json:"coremark"`
	FfMpeg     *FfmpegMetrics  `json:"ffmpeg"`
	NvidiaGPUs []NvidiaGPU     `json:"nvidia_gpus"`
	Memory     Memory          `json:"memory"`
	CPU        sysinfo.CPU     `json:"cpu"`
	NUMA       NUMA            `json:"numa"`
}

var ExtraInstanceDetails map[string]InstanceDetails

func init() {
	err := json.Unmarshal(extrasJSON, &ExtraInstanceDetails)
	if err != nil {
		panic(err)
	}
}
