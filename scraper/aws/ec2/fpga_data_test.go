package ec2

import "testing"

func TestAddFpgaInfo(t *testing.T) {
	instances := map[string]*EC2Instance{
		"vt1.3xlarge":  {InstanceType: "vt1.3xlarge"},
		"vt1.6xlarge":  {InstanceType: "vt1.6xlarge"},
		"vt1.24xlarge": {InstanceType: "vt1.24xlarge"},
		// Non-FPGA instance must stay at 0.
		"m5.large": {InstanceType: "m5.large"},
		// FPGA count already set from the AWS API (f1) must be preserved.
		"f1.2xlarge": {InstanceType: "f1.2xlarge", FPGA: 1},
	}

	addFpgaInfo(instances)

	expected := map[string]int{
		"vt1.3xlarge":  1,
		"vt1.6xlarge":  2,
		"vt1.24xlarge": 8,
		"m5.large":     0,
		"f1.2xlarge":   1,
	}

	for instanceType, want := range expected {
		if got := instances[instanceType].FPGA; got != want {
			t.Errorf("FPGA count for %s = %d, want %d", instanceType, got, want)
		}
	}
}
