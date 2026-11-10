package ec2

import "testing"

// Compute capabilities from https://developer.nvidia.com/cuda-gpus
func TestGPUDataComputeCapability(t *testing.T) {
	tests := map[string]float64{
		"g6.xlarge":          8.9,
		"g6f.large":          8.9,
		"g6f.xlarge":         8.9,
		"g6f.2xlarge":        8.9,
		"g6f.4xlarge":        8.9,
		"gr6f.4xlarge":       8.9,
		"p6-b200.48xlarge":   10.0,
		"p6e-gb200.36xlarge": 10.0,
		"p6-b300.48xlarge":   10.3,
	}
	for instanceType, want := range tests {
		data, ok := GPU_DATA[instanceType]
		if !ok {
			t.Errorf("%s: missing from GPU_DATA", instanceType)
			continue
		}
		if data.computeCapability != want {
			t.Errorf("%s (%s): computeCapability = %v, want %v", instanceType, data.gpuModel, data.computeCapability, want)
		}
	}
}

func TestGPUDataSameModelSameComputeCapability(t *testing.T) {
	seen := map[string]string{}
	for instanceType, data := range GPU_DATA {
		first, ok := seen[data.gpuModel]
		if !ok {
			seen[data.gpuModel] = instanceType
			continue
		}
		if want := GPU_DATA[first].computeCapability; data.computeCapability != want {
			t.Errorf("%s and %s both use %q but have compute capability %v and %v",
				first, instanceType, data.gpuModel, want, data.computeCapability)
		}
	}
}

// GPU count and memory per instance from
// https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
func TestGPUDataPerInstanceCountAndMemory(t *testing.T) {
	tests := map[string]struct {
		gpuCount  float64
		gpuMemory int
	}{
		"p5.48xlarge":        {8, 640},
		"p5e.48xlarge":       {8, 1128},
		"p6e-gb200.36xlarge": {4, 740},
	}
	for instanceType, want := range tests {
		data, ok := GPU_DATA[instanceType]
		if !ok {
			t.Errorf("%s: missing from GPU_DATA", instanceType)
			continue
		}
		if data.gpuCount != want.gpuCount || data.gpuMemory != want.gpuMemory {
			t.Errorf("%s: gpuCount = %v, gpuMemory = %v, want %v and %v",
				instanceType, data.gpuCount, data.gpuMemory, want.gpuCount, want.gpuMemory)
		}
	}
}
