package ec2

import "testing"

func TestAddGpuInfoDoesNotTreatNeuronAcceleratorsAsGPUs(t *testing.T) {
	instances := map[string]*EC2Instance{
		"inf2.8xlarge": {InstanceType: "inf2.8xlarge"},
		"trn2.48xlarge": {
			InstanceType: "trn2.48xlarge",
		},
		"g4dn.xlarge": {
			InstanceType: "g4dn.xlarge",
		},
	}

	addGpuInfo(instances)

	for _, instanceType := range []string{"inf2.8xlarge", "trn2.48xlarge"} {
		instance := instances[instanceType]
		if instance.GPU != 0 {
			t.Errorf("%s GPU = %v, want 0", instanceType, instance.GPU)
		}
		if instance.GPUModel != nil {
			t.Errorf("%s GPUModel = %q, want nil", instanceType, *instance.GPUModel)
		}
		if instance.GPUMemory != 0 {
			t.Errorf("%s GPUMemory = %d, want 0", instanceType, instance.GPUMemory)
		}
	}

	gpuInstance := instances["g4dn.xlarge"]
	if gpuInstance.GPU != 1 {
		t.Errorf("g4dn.xlarge GPU = %v, want 1", gpuInstance.GPU)
	}
	if gpuInstance.GPUModel == nil || *gpuInstance.GPUModel != "NVIDIA T4 Tensor Core" {
		t.Fatalf("g4dn.xlarge GPUModel = %v, want NVIDIA T4 Tensor Core", gpuInstance.GPUModel)
	}
	if gpuInstance.GPUMemory != 16 {
		t.Errorf("g4dn.xlarge GPUMemory = %d, want 16", gpuInstance.GPUMemory)
	}
}
