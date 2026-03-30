package main

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
)

// flexFloat unmarshals a JSON value that may be either a number or a numeric
// string (as produced by the scraper for RDS, ElastiCache, Redshift, OpenSearch).
type flexFloat float64

func (f *flexFloat) UnmarshalJSON(b []byte) error {
	var n float64
	if err := json.Unmarshal(b, &n); err == nil {
		*f = flexFloat(n)
		return nil
	}
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	n, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return err
	}
	*f = flexFloat(n)
	return nil
}

// Value is a single spec row entry (icon + label + value).
type Value struct {
	Name           string
	Value          string
	SquareIconPath string // relative to assetsDir, e.g. "icons/cpu-cores.png"
}

// InstanceOverlay holds everything needed to render one OG image.
type InstanceOverlay struct {
	InstanceType   string // used for ONLY_INSTANCES filtering
	Name           string // display name
	CategoryHeader string
	Filename       string // absolute output path
	URL            string // full URL shown at bottom of image
	Values         []Value
}

// genContext holds shared configuration for all generators.
type genContext struct {
	baseURL   string // NEXT_PUBLIC_URL, e.g. "https://instances.vantage.sh"
	wwwDir    string
	outDir    string
	assetsDir string
}

func (c *genContext) instanceURL(path string) string {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return c.baseURL + path
	}
	u.Path = path
	return u.String()
}

func readJSON(path string, v any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("reading %s: %w", path, err)
	}
	return json.Unmarshal(data, v)
}

func generateEC2Overlays(ctx *genContext) []InstanceOverlay {
	type storage struct {
		Size     float64 `json:"size"`
		SizeUnit string  `json:"size_unit"`
	}
	type instance struct {
		InstanceType string   `json:"instance_type"`
		Family       string   `json:"family"`
		VCPU         int      `json:"vCPU"`
		Memory       float64  `json:"memory"`
		GPU          float64  `json:"GPU"`
		GPUMemory    float64  `json:"GPU_memory"`
		Arch         []string `json:"arch"`
		Storage      *storage `json:"storage"`
	}

	var instances []instance
	if err := readJSON(filepath.Join(ctx.wwwDir, "instances.json"), &instances); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	overlays := make([]InstanceOverlay, 0, len(instances))
	for _, inst := range instances {
		arch := "N/A"
		if len(inst.Arch) > 0 {
			arch = inst.Arch[0]
		}

		gpuVal := "0"
		if inst.GPU > 0 {
			gpuVal = fmt.Sprintf("%.0f (%.0f GB VRAM)", inst.GPU, inst.GPUMemory)
		}

		storageVal := "EBS only"
		if inst.Storage != nil {
			storageVal = fmt.Sprintf("%.0f %s", inst.Storage.Size, inst.Storage.SizeUnit)
		}

		header := "EC2 Instances"
		if inst.Family != "" {
			header = fmt.Sprintf("EC2 Instances (%s)", inst.Family)
		}

		overlays = append(overlays, InstanceOverlay{
			InstanceType:   inst.InstanceType,
			Name:           inst.InstanceType,
			CategoryHeader: header,
			Filename:       filepath.Join(ctx.outDir, "aws", "ec2", inst.InstanceType+".png"),
			URL:            ctx.instanceURL("/aws/ec2/" + inst.InstanceType),
			Values: []Value{
				{Name: "vCPUs", Value: fmt.Sprintf("%d", inst.VCPU), SquareIconPath: "icons/cpu-cores.png"},
				{Name: "Architecture", Value: arch, SquareIconPath: "icons/cpu-arch.png"},
				{Name: "RAM", Value: fmt.Sprintf("%.0f GB", inst.Memory), SquareIconPath: "icons/ram.png"},
				{Name: "GPUs", Value: gpuVal, SquareIconPath: "icons/gpu.png"},
				{Name: "Storage", Value: storageVal, SquareIconPath: "icons/storage.png"},
			},
		})
	}
	return overlays
}

func generateRDSOverlays(ctx *genContext) []InstanceOverlay {
	type instance struct {
		InstanceType string    `json:"instance_type"`
		Family       string    `json:"family"`
		VCPU         flexFloat `json:"vcpu"`
		Memory       flexFloat `json:"memory"`
		Storage      string    `json:"storage"`
		Arch         string    `json:"arch"`
	}

	var instances []instance
	if err := readJSON(filepath.Join(ctx.wwwDir, "rds", "instances.json"), &instances); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	overlays := make([]InstanceOverlay, 0, len(instances))
	for _, inst := range instances {
		storageVal := "EBS only"
		if inst.Storage != "" {
			storageVal = inst.Storage + " GB"
		}

		header := "RDS Instances"
		if inst.Family != "" {
			header = fmt.Sprintf("RDS Instances (%s)", inst.Family)
		}

		values := []Value{
			{Name: "vCPUs", Value: fmt.Sprintf("%.0f", inst.VCPU), SquareIconPath: "icons/cpu-cores.png"},
		}
		if inst.Arch != "" {
			values = append(values, Value{Name: "Architecture", Value: inst.Arch, SquareIconPath: "icons/cpu-arch.png"})
		}
		values = append(values,
			Value{Name: "RAM", Value: fmt.Sprintf("%.0f GB", inst.Memory), SquareIconPath: "icons/ram.png"},
			Value{Name: "Storage", Value: storageVal, SquareIconPath: "icons/storage.png"},
		)

		overlays = append(overlays, InstanceOverlay{
			InstanceType:   inst.InstanceType,
			Name:           inst.InstanceType,
			CategoryHeader: header,
			Filename:       filepath.Join(ctx.outDir, "aws", "rds", inst.InstanceType+".png"),
			URL:            ctx.instanceURL("/aws/rds/" + inst.InstanceType),
			Values:         values,
		})
	}
	return overlays
}

func generateElastiCacheOverlays(ctx *genContext) []InstanceOverlay {
	type instance struct {
		InstanceType       string    `json:"instance_type"`
		Family             string    `json:"family"`
		VCPU               flexFloat `json:"vcpu"`
		Memory             flexFloat `json:"memory"`
		NetworkPerformance string    `json:"network_performance"`
	}

	var instances []instance
	if err := readJSON(filepath.Join(ctx.wwwDir, "cache", "instances.json"), &instances); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	overlays := make([]InstanceOverlay, 0, len(instances))
	for _, inst := range instances {
		netVal := "N/A"
		if inst.NetworkPerformance != "" {
			netVal = inst.NetworkPerformance
		}

		header := "ElastiCache Instances"
		if inst.Family != "" {
			header = fmt.Sprintf("ElastiCache Instances (%s)", inst.Family)
		}

		overlays = append(overlays, InstanceOverlay{
			InstanceType:   inst.InstanceType,
			Name:           inst.InstanceType,
			CategoryHeader: header,
			Filename:       filepath.Join(ctx.outDir, "aws", "elasticache", inst.InstanceType+".png"),
			URL:            ctx.instanceURL("/aws/elasticache/" + inst.InstanceType),
			Values: []Value{
				{Name: "vCPUs", Value: fmt.Sprintf("%.0f", inst.VCPU), SquareIconPath: "icons/cpu-cores.png"},
				{Name: "RAM", Value: fmt.Sprintf("%.0f GB", inst.Memory), SquareIconPath: "icons/ram.png"},
				{Name: "Networking", Value: netVal, SquareIconPath: "icons/storage.png"},
			},
		})
	}
	return overlays
}

func generateRedshiftOverlays(ctx *genContext) []InstanceOverlay {
	type instance struct {
		InstanceType string    `json:"instance_type"`
		Family       string    `json:"family"`
		VCPU         flexFloat `json:"vcpu"`
		Memory       flexFloat `json:"memory"`
		Storage      string    `json:"storage"`
		ECU          string    `json:"ecu"`
		IO           string    `json:"io"`
	}

	var instances []instance
	if err := readJSON(filepath.Join(ctx.wwwDir, "redshift", "instances.json"), &instances); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	overlays := make([]InstanceOverlay, 0, len(instances))
	for _, inst := range instances {
		storageVal := "EBS only"
		if inst.Storage != "" {
			storageVal = inst.Storage
		}
		ecuVal := "Variable"
		if inst.ECU != "" {
			ecuVal = inst.ECU
		}
		ioVal := "N/A"
		if inst.IO != "" {
			ioVal = inst.IO
		}

		header := "Redshift Instances"
		if inst.Family != "" {
			header = fmt.Sprintf("Redshift Instances (%s)", inst.Family)
		}

		overlays = append(overlays, InstanceOverlay{
			InstanceType:   inst.InstanceType,
			Name:           inst.InstanceType,
			CategoryHeader: header,
			Filename:       filepath.Join(ctx.outDir, "aws", "redshift", inst.InstanceType+".png"),
			URL:            ctx.instanceURL("/aws/redshift/" + inst.InstanceType),
			Values: []Value{
				{Name: "vCPUs", Value: fmt.Sprintf("%.0f", inst.VCPU), SquareIconPath: "icons/cpu-cores.png"},
				{Name: "RAM", Value: fmt.Sprintf("%.0f GB", inst.Memory), SquareIconPath: "icons/ram.png"},
				{Name: "Storage", Value: storageVal, SquareIconPath: "icons/storage.png"},
				{Name: "ECUs", Value: ecuVal, SquareIconPath: "icons/cpu-arch.png"},
				{Name: "IO", Value: ioVal, SquareIconPath: "icons/gpu.png"},
			},
		})
	}
	return overlays
}

func generateOpenSearchOverlays(ctx *genContext) []InstanceOverlay {
	type instance struct {
		InstanceType string    `json:"instance_type"`
		Family       string    `json:"family"`
		VCPU         flexFloat `json:"vcpu"`
		Memory       flexFloat `json:"memory"`
		ECU          string    `json:"ecu"`
		Storage      string    `json:"storage"`
	}

	var instances []instance
	if err := readJSON(filepath.Join(ctx.wwwDir, "opensearch", "instances.json"), &instances); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	overlays := make([]InstanceOverlay, 0, len(instances))
	for _, inst := range instances {
		ecuVal := "Variable"
		if inst.ECU != "" {
			ecuVal = inst.ECU
		}
		storageVal := "EBS only"
		if inst.Storage != "" {
			storageVal = inst.Storage
		}

		header := "OpenSearch Instances"
		if inst.Family != "" {
			header = fmt.Sprintf("OpenSearch Instances (%s)", inst.Family)
		}

		overlays = append(overlays, InstanceOverlay{
			InstanceType:   inst.InstanceType,
			Name:           inst.InstanceType,
			CategoryHeader: header,
			Filename:       filepath.Join(ctx.outDir, "aws", "opensearch", inst.InstanceType+".png"),
			URL:            ctx.instanceURL("/aws/opensearch/" + inst.InstanceType),
			Values: []Value{
				{Name: "vCPUs", Value: fmt.Sprintf("%.0f", inst.VCPU), SquareIconPath: "icons/cpu-cores.png"},
				{Name: "RAM", Value: fmt.Sprintf("%.0f GB", inst.Memory), SquareIconPath: "icons/ram.png"},
				{Name: "ECUs", Value: ecuVal, SquareIconPath: "icons/cpu-arch.png"},
				{Name: "Storage", Value: storageVal, SquareIconPath: "icons/storage.png"},
			},
		})
	}
	return overlays
}

func generateAzureOverlays(ctx *genContext) []InstanceOverlay {
	type instance struct {
		InstanceType    string  `json:"instance_type"`
		PrettyNameAzure string  `json:"pretty_name_azure"`
		Family          string  `json:"family"`
		VCPU            int     `json:"vcpu"`
		Memory          float64 `json:"memory"`
		Size            float64 `json:"size"`
		GPU             string  `json:"GPU"`
	}

	var instances []instance
	if err := readJSON(filepath.Join(ctx.wwwDir, "azure", "instances.json"), &instances); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	overlays := make([]InstanceOverlay, 0, len(instances))
	for _, inst := range instances {
		gpuVal := "0"
		if inst.GPU != "" {
			gpuVal = inst.GPU
		}

		overlays = append(overlays, InstanceOverlay{
			InstanceType:   inst.InstanceType,
			Name:           inst.PrettyNameAzure,
			CategoryHeader: "Azure Instances",
			Filename:       filepath.Join(ctx.outDir, "azure", "vm", inst.InstanceType+".png"),
			URL:            ctx.instanceURL("/azure/vm/" + inst.InstanceType),
			Values: []Value{
				{Name: "vCPUs", Value: fmt.Sprintf("%d", inst.VCPU), SquareIconPath: "icons/cpu-cores.png"},
				{Name: "RAM", Value: fmt.Sprintf("%.0f GB", inst.Memory), SquareIconPath: "icons/ram.png"},
				{Name: "Storage", Value: fmt.Sprintf("%.0f GB", inst.Size), SquareIconPath: "icons/storage.png"},
				{Name: "GPUs", Value: gpuVal, SquareIconPath: "icons/gpu.png"},
			},
		})
	}
	return overlays
}

func generateGCPOverlays(ctx *genContext) []InstanceOverlay {
	type instance struct {
		InstanceType string  `json:"instance_type"`
		PrettyName   string  `json:"pretty_name"`
		Family       string  `json:"family"`
		VCPU         int     `json:"vCPU"`
		Memory       float64 `json:"memory"`
		GPU          float64 `json:"GPU"`
		GPUMemory    float64 `json:"GPU_memory"`
		LocalSSD     bool    `json:"local_ssd"`
		LocalSSDSize float64 `json:"local_ssd_size"`
		SharedCPU    bool    `json:"shared_cpu"`
	}

	var instances []instance
	if err := readJSON(filepath.Join(ctx.wwwDir, "gcp", "instances.json"), &instances); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	overlays := make([]InstanceOverlay, 0, len(instances))
	for _, inst := range instances {
		gpuVal := "0"
		if inst.GPU > 0 {
			gpuVal = fmt.Sprintf("%.0f (%.0f GB)", inst.GPU, inst.GPUMemory)
		}

		ssdVal := "No"
		if inst.LocalSSD {
			ssdVal = fmt.Sprintf("%.0f GB", inst.LocalSSDSize)
		}

		sharedVal := "No"
		if inst.SharedCPU {
			sharedVal = "Yes"
		}

		header := "GCP Instances"
		if inst.Family != "" {
			header = fmt.Sprintf("GCP Instances (%s)", inst.Family)
		}

		overlays = append(overlays, InstanceOverlay{
			InstanceType:   inst.InstanceType,
			Name:           inst.PrettyName,
			CategoryHeader: header,
			Filename:       filepath.Join(ctx.outDir, "gcp", inst.InstanceType+".png"),
			URL:            ctx.instanceURL("/gcp/" + inst.InstanceType),
			Values: []Value{
				{Name: "vCPUs", Value: fmt.Sprintf("%d", inst.VCPU), SquareIconPath: "icons/cpu-cores.png"},
				{Name: "RAM", Value: fmt.Sprintf("%.0f GB", inst.Memory), SquareIconPath: "icons/ram.png"},
				{Name: "GPUs", Value: gpuVal, SquareIconPath: "icons/gpu.png"},
				{Name: "Local SSD", Value: ssdVal, SquareIconPath: "icons/storage.png"},
				{Name: "Shared CPU", Value: sharedVal, SquareIconPath: "icons/cpu-arch.png"},
			},
		})
	}
	return overlays
}
