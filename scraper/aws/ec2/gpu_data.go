package ec2

import "log"

type gpuData struct {
	gpuModel          string
	computeCapability float64
	gpuCount          float64
	gpuMemory         int
}

/*
Add info about GPUs from the manually-curated dictionaries below. They are
manually curated because GPU models and their corresponding CUDA Compute
Capability are not listed in a structured form anywhere in the AWS docs.

This function will print a warning if it encounters an instance with
.GPU > 0 for which GPU information is not included in the dictionaries
below. This may indicate that AWS has added a new GPU instance type. If you
see such a warning and want to fill in the missing information, check
https://aws.amazon.com/ec2/instance-types/#Accelerated_Computing for
descriptions of the instance types and https://en.wikipedia.org/wiki/CUDA
for information on the CUDA compute capability of different Nvidia GPU
models.

For G5 instances, please reference the following:

	https://aws.amazon.com/ec2/instance-types/g5/
	https://github.com/vantage-sh/ec2instances.info/issues/593
*/
var GPU_DATA = map[string]gpuData{
	"g2.2xlarge": {
		// No longer listed in AWS docs linked above. Alternative source is
		// https://medium.com/@manku_timma1/part-1-g2-2xlarge-gpu-basics-805ad40a37a4
		// The model has 2 units, 4G of memory each, but AWS exposes only 1 unit per instance
		gpuModel:          "NVIDIA GRID K520",
		computeCapability: 3.0,
		gpuCount:          1,
		gpuMemory:         4,
	},
	"g2.8xlarge": {
		// No longer listed in AWS docs linked above. Alternative source is
		// https://aws.amazon.com/blogs/aws/new-g2-instance-type-with-4x-more-gpu-power/
		gpuModel:          "NVIDIA GRID K520",
		computeCapability: 3.0,
		gpuCount:          4,
		gpuMemory:         16,
	},
	"g3s.xlarge": {
		gpuModel:          "NVIDIA Tesla M60",
		computeCapability: 5.2,
		gpuCount:          1,
		gpuMemory:         8,
	},
	"g3.4xlarge": {
		gpuModel:          "NVIDIA Tesla M60",
		computeCapability: 5.2,
		gpuCount:          1,
		gpuMemory:         8,
	},
	"g3.8xlarge": {
		gpuModel:          "NVIDIA Tesla M60",
		computeCapability: 5.2,
		gpuCount:          2,
		gpuMemory:         16,
	},
	"g3.16xlarge": {
		gpuModel:          "NVIDIA Tesla M60",
		computeCapability: 5.2,
		gpuCount:          4,
		gpuMemory:         32,
	},
	"g4dn.xlarge": {
		gpuModel:          "NVIDIA T4 Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g4dn.2xlarge": {
		gpuModel:          "NVIDIA T4 Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g4dn.4xlarge": {
		gpuModel:          "NVIDIA T4 Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g4dn.8xlarge": {
		gpuModel:          "NVIDIA T4 Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g4dn.16xlarge": {
		gpuModel:          "NVIDIA T4 Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g4dn.12xlarge": {
		gpuModel:          "NVIDIA T4 Tensor Core",
		computeCapability: 7.5,
		gpuCount:          4,
		gpuMemory:         64,
	},
	"g4dn.metal": {
		gpuModel:          "NVIDIA T4 Tensor Core",
		computeCapability: 7.5,
		gpuCount:          8,
		gpuMemory:         128,
	},
	"p2.xlarge": {
		gpuModel:          "NVIDIA Tesla K80",
		computeCapability: 3.7,
		gpuCount:          1,
		gpuMemory:         12,
	},
	"p2.8xlarge": {
		gpuModel:          "NVIDIA Tesla K80",
		computeCapability: 3.7,
		gpuCount:          4,
		gpuMemory:         96,
	},
	"p2.16xlarge": {
		gpuModel:          "NVIDIA Tesla K80",
		computeCapability: 3.7,
		gpuCount:          8,
		gpuMemory:         192,
	},
	"p3.2xlarge": {
		gpuModel:          "NVIDIA Tesla V100",
		computeCapability: 7.0,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"p3.8xlarge": {
		gpuModel:          "NVIDIA Tesla V100",
		computeCapability: 7.0,
		gpuCount:          4,
		gpuMemory:         64,
	},
	"p3.16xlarge": {
		gpuModel:          "NVIDIA Tesla V100",
		computeCapability: 7.0,
		gpuCount:          8,
		gpuMemory:         128,
	},
	"p3dn.24xlarge": {
		gpuModel:          "NVIDIA Tesla V100",
		computeCapability: 7.0,
		gpuCount:          8,
		gpuMemory:         256,
	},
	"g5.xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g5.2xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g5.4xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g5.8xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g5.16xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g5.12xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          4,
		gpuMemory:         96,
	},
	"g5.24xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          4,
		gpuMemory:         96,
	},
	"g5.48xlarge": {
		gpuModel:          "NVIDIA A10G",
		computeCapability: 8.6,
		gpuCount:          8,
		gpuMemory:         192,
	},
	"g6.xlarge": {
		// GPU core count found from the whitepaper
		// https://images.nvidia.com/aem-dam/Solutions/Data-Center/l4/nvidia-ada-gpu-architecture-whitepaper-v2.1.pdf
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g6.2xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g6.4xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g6.8xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"gr6.4xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"gr6.8xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g6.16xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         24,
	},
	"g6.12xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          4,
		gpuMemory:         96,
	},
	"g6.24xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          4,
		gpuMemory:         96,
	},
	"g6.48xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 8.9,
		gpuCount:          8,
		gpuMemory:         192,
	},
	"g6e.xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         48,
	},
	"g6e.2xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         48,
	},
	"g6e.4xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         48,
	},
	"g6e.8xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         48,
	},
	"g6e.16xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          1,
		gpuMemory:         48,
	},
	"g6e.12xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          4,
		gpuMemory:         192,
	},
	"g6e.24xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          4,
		gpuMemory:         192,
	},
	"g6e.48xlarge": {
		gpuModel:          "NVIDIA L40S",
		computeCapability: 8.9,
		gpuCount:          8,
		gpuMemory:         384,
	},
	"p4d.24xlarge": {
		gpuModel:          "NVIDIA A100",
		computeCapability: 8.0,
		gpuCount:          8,
		gpuMemory:         320,
	},
	"p4de.24xlarge": {
		gpuModel:          "NVIDIA A100",
		computeCapability: 8.0,
		gpuCount:          8,
		gpuMemory:         640,
	},
	"p5e.48xlarge": {
		gpuModel:          "NVIDIA H200",
		computeCapability: 9.0,
		gpuCount:          8,
		gpuMemory:         1128,
	},
	"p5en.48xlarge": {
		gpuModel:          "NVIDIA H200",
		computeCapability: 9.0,
		gpuCount:          8,
		gpuMemory:         1128,
	},
	"g5g.xlarge": {
		gpuModel:          "NVIDIA T4G Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g5g.2xlarge": {
		gpuModel:          "NVIDIA T4G Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g5g.4xlarge": {
		gpuModel:          "NVIDIA T4G Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g5g.8xlarge": {
		gpuModel:          "NVIDIA T4G Tensor Core",
		computeCapability: 7.5,
		gpuCount:          1,
		gpuMemory:         16,
	},
	"g5g.16xlarge": {
		gpuModel:          "NVIDIA T4G Tensor Core",
		computeCapability: 7.5,
		gpuCount:          2,
		gpuMemory:         32,
	},
	"g5g.metal": {
		gpuModel:          "NVIDIA T4G Tensor Core",
		computeCapability: 7.5,
		gpuCount:          2,
		gpuMemory:         32,
	},
	"g4ad.xlarge": {
		gpuModel:          "AMD Radeon Pro V520",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         8,
	},
	"g4ad.2xlarge": {
		gpuModel:          "AMD Radeon Pro V520",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         8,
	},
	"g4ad.4xlarge": {
		gpuModel:          "AMD Radeon Pro V520",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         8,
	},
	"g4ad.8xlarge": {
		gpuModel:          "AMD Radeon Pro V520",
		computeCapability: 0,
		gpuCount:          2,
		gpuMemory:         16,
	},
	"g4ad.16xlarge": {
		gpuModel:          "AMD Radeon Pro V520",
		computeCapability: 0,
		gpuCount:          4,
		gpuMemory:         32,
	},
	"trn1.2xlarge": {
		gpuModel:          "AWS Inferentia",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         32,
	},
	"trn1.32xlarge": {
		gpuModel:          "AWS Inferentia",
		computeCapability: 0,
		gpuCount:          16,
		gpuMemory:         512,
	},
	"trn2.48xlarge": {
		gpuModel:          "AWS Trainium2",
		computeCapability: 0,
		gpuCount:          16,
		gpuMemory:         96,
	},
	"trn1n.32xlarge": {
		gpuModel:          "AWS Inferentia",
		computeCapability: 0,
		gpuCount:          16,
		gpuMemory:         512,
	},
	"inf1.xlarge": {
		gpuModel:          "AWS Inferentia",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         0,
	},
	"inf1.2xlarge": {
		gpuModel:          "AWS Inferentia",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         0,
	},
	"inf1.6xlarge": {
		gpuModel:          "AWS Inferentia",
		computeCapability: 0,
		gpuCount:          4,
		gpuMemory:         0,
	},
	"inf1.24xlarge": {
		gpuModel:          "AWS Inferentia",
		computeCapability: 0,
		gpuCount:          16,
		gpuMemory:         0,
	},
	"inf2.xlarge": {
		gpuModel:          "AWS Inferentia2",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         32,
	},
	"inf2.8xlarge": {
		gpuModel:          "AWS Inferentia2",
		computeCapability: 0,
		gpuCount:          1,
		gpuMemory:         32,
	},
	"inf2.24xlarge": {
		gpuModel:          "AWS Inferentia2",
		computeCapability: 0,
		gpuCount:          6,
		gpuMemory:         192,
	},
	"inf2.48xlarge": {
		gpuModel:          "AWS Inferentia2",
		computeCapability: 0,
		gpuCount:          12,
		gpuMemory:         384,
	},
	"p5.4xlarge": {
		gpuModel:          "NVIDIA H100",
		computeCapability: 9.0,
		gpuCount:          1,
		gpuMemory:         80,
	},
	"p5.48xlarge": {
		gpuModel:          "NVIDIA H100",
		computeCapability: 9.0,
		gpuCount:          8,
		gpuMemory:         640,
	},
	"p6e-gb200.36xlarge": {
		gpuModel:          "NVIDIA B200",
		computeCapability: 10.0,
		// https://aws.amazon.com/ec2/instance-types/p6/
		gpuCount:  36,
		gpuMemory: 6660,
	},
	"p6-b200.48xlarge": {
		gpuModel:          "NVIDIA B200",
		computeCapability: 10.0,
		gpuCount:          8,
		// https://resources.nvidia.com/en-us-dgx-systems/dgx-b200-datasheet
		gpuMemory: 1440,
	},
	"gr6f.4xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 10.0,
		gpuCount:          0.5,
		gpuMemory:         12,
	},
	"g6f.large": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 10.0,
		gpuCount:          0.125,
		gpuMemory:         3,
	},
	"g6f.4xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 10.0,
		gpuCount:          0.5,
		gpuMemory:         12,
	},
	"g6f.2xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 10.0,
		gpuCount:          0.25,
		gpuMemory:         6,
	},
	"g6f.xlarge": {
		gpuModel:          "NVIDIA L4",
		computeCapability: 10.0,
		gpuCount:          0.125,
		gpuMemory:         3,
	},
	"dl2q.24xlarge": {
		gpuModel:          "Qualcomm AI 100 Accelerators",
		computeCapability: 0,
		gpuCount:          8,
		gpuMemory:         128,
	},
}

func addGpuInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding GPU info to EC2")

	for instanceType, instance := range instances {
		gpuData, ok := GPU_DATA[instanceType]
		if !ok {
			if instance.GPU > 0 {
				log.Default().Println("WARNING: GPU data missing for", instanceType)
			}
			continue
		}

		instance.GPU = gpuData.gpuCount
		instance.GPUModel = &gpuData.gpuModel
		instance.ComputeCapability = gpuData.computeCapability
		instance.GPUMemory = gpuData.gpuMemory
	}
}
