package ec2

import "log"

/*
AWS does not return FpgaInfo from DescribeInstanceTypes for vt1 instances, even
though they carry Xilinx Alveo U30 media accelerator cards. AWS markets vt1 as
"media accelerators" rather than F1-style FPGAs, so the FpgaInfo field used to
populate instance.FPGA in enrichEc2Instance is nil for vt1 and the count stays
0 (see https://github.com/vantage-sh/ec2instances.info/issues/825).

The U30 is a Zynq UltraScale+ based FPGA accelerator card. We report the number
of U30 accelerator cards per instance, which is the FPGA accelerator unit AWS
itself counts in its specs and the unit directly comparable to the per-FPGA
count AWS reports via FpgaInfo for f1 instances (f1.2xlarge=1, f1.4xlarge=2,
f1.16xlarge=8). Each U30 card additionally contains two XCU30 SoCs, but the
card is the accelerator unit AWS exposes, so we count cards to stay consistent
with the f1 1/2/8 progression.

Sources:

	https://aws.amazon.com/ec2/instance-types/vt1/
	https://aws.amazon.com/blogs/compute/deep-dive-on-amazon-ec2-vt1-instances/
*/
var FPGA_DATA = map[string]int{
	"vt1.3xlarge":  1,
	"vt1.6xlarge":  2,
	"vt1.24xlarge": 8,
}

// addFpgaInfo fills in FPGA counts for instances that carry FPGA accelerators
// which AWS does not report through DescribeInstanceTypes' FpgaInfo. Values
// already set from the AWS API (e.g. f1) are left untouched.
func addFpgaInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding FPGA info to EC2")

	for instanceType, fpgaCount := range FPGA_DATA {
		instance, ok := instances[instanceType]
		if !ok {
			continue
		}
		if instance.FPGA == 0 {
			instance.FPGA = fpgaCount
		}
	}
}
