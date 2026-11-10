package ec2

import "testing"

func TestAddGpuInfoFillsGaudiForDL1(t *testing.T) {
	instances := map[string]*EC2Instance{
		"dl1.24xlarge": {InstanceType: "dl1.24xlarge"},
	}
	addGpuInfo(instances)

	got := instances["dl1.24xlarge"]
	if got.GPU != 8 || got.GPUMemory != 256 || got.GPUModel == nil || *got.GPUModel != "Habana Gaudi HL-205" {
		model := "<nil>"
		if got.GPUModel != nil {
			model = *got.GPUModel
		}
		t.Errorf("dl1.24xlarge: GPU = %v, GPUMemory = %v, GPUModel = %s, want 8, 256 and Habana Gaudi HL-205",
			got.GPU, got.GPUMemory, model)
	}
	if got.ComputeCapability != 0 {
		t.Errorf("dl1.24xlarge: ComputeCapability = %v, want 0 (not a CUDA device)", got.ComputeCapability)
	}
}
