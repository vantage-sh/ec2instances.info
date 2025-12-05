package ec2

import (
	"log"
	"scraper/aws/awsutils"
	"scraper/utils"
	"strconv"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

var IPV4_ONLY_FAMILIES = []string{
	"cg1",
	"m1",
	"m3",
	"c1",
	"cc2",
	"g2",
	"m2",
	"cr1",
	"hs1",
	"t1",
}

var EC2_FAMILY_NAMES = map[string]string{
	"c1":      "C1 High-CPU",
	"c3":      "C3 High-CPU",
	"c4":      "C4 High-CPU",
	"c5":      "C5 High-CPU",
	"c5d":     "C5 High-CPU",
	"cc2":     "Cluster Compute",
	"cg1":     "Cluster GPU",
	"cr1":     "High Memory Cluster",
	"hi1":     "HI1. High I/O",
	"hs1":     "High Storage",
	"i3":      "I3 High I/O",
	"m1":      "M1 General Purpose",
	"m2":      "M2 High Memory",
	"m3":      "M3 General Purpose",
	"m4":      "M4 General Purpose",
	"m5":      "M5 General Purpose",
	"m5d":     "M5 General Purpose",
	"g3":      "G3 Graphics GPU",
	"g4":      "G4 Graphics and Machine Learning GPU",
	"g5":      "G5 Graphics and Machine Learning GPU",
	"g6":      "G6 Graphics and Machine Learning GPU",
	"g6e":     "G6e Graphics and Machine Learning GPU",
	"gr6":     "Gr6 Graphics and Machine Learning GPU High RAM ratio",
	"p2":      "P2 General Purpose GPU",
	"p3":      "P3 High Performance GPU",
	"p4d":     "P4D Highest Performance GPU",
	"p5e":     "P5e High Performance Computing GPU",
	"p5en":    "P5en High Performance Computing GPU",
	"p6-b200": "P6-B200 High Performance and Machine Learning GPU",
	"r3":      "R3 High-Memory",
	"r4":      "R4 High-Memory",
	"x1":      "X1 Extra High-Memory",
}

func enrichEc2Instance(instance *EC2Instance, attributes map[string]string, ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo]) {
	instance.Family = attributes["instanceFamily"]
	VCPU, err := strconv.Atoi(attributes["vcpu"])
	if err != nil {
		log.Fatal(err)
	}
	instance.VCPU = append(instance.VCPU, VCPU)
	switch instance.InstanceType {
	case "u-6tb1.metal":
		instance.Memory = append(instance.Memory, 6144)
	case "u-9tb1.metal":
		instance.Memory = append(instance.Memory, 9216)
	case "u-12tb1.metal":
		instance.Memory = append(instance.Memory, 12288)
	default:
		Memory, err := strconv.ParseFloat(strings.Split(attributes["memory"], " ")[0], 64)
		if err != nil {
			log.Fatal(err)
		}
		instance.Memory = append(instance.Memory, Memory)
	}

	for _, family := range IPV4_ONLY_FAMILIES {
		if strings.HasPrefix(instance.InstanceType, family) {
			instance.IPV6Support = false
			break
		}
	}

	if instance.PrettyName == "" {
		instance.PrettyName = awsutils.AddPrettyName(instance.InstanceType, EC2_FAMILY_NAMES)
	}

	apiDescription, hasApiDescription := ec2ApiResponses.Get(instance.InstanceType)
	instance.PhysicalProcessor = attributes["physicalProcessor"]
	if hasApiDescription {
		arches := make([]string, len(apiDescription.ProcessorInfo.SupportedArchitectures))
		for i, arch := range apiDescription.ProcessorInfo.SupportedArchitectures {
			arches[i] = string(arch)
		}
		instance.Arch = arches

		if apiDescription.NetworkInfo.NetworkPerformance == nil {
			instance.NetworkPerformance = "Unknown"
		} else if *apiDescription.NetworkInfo.NetworkPerformance != "NA" {
			instance.NetworkPerformance = *apiDescription.NetworkInfo.NetworkPerformance
		}
	} else {
		if instance.Arch == nil {
			// Try and figure out the value with a best guess
			if strings.Contains(instance.PhysicalProcessor, "AWS Graviton") {
				// Presume arm64 for Amazon chips
				instance.Arch = []string{"arm64"}
			} else {
				// Otherwise, presume x86_64
				instance.Arch = []string{"x86_64"}
				processorArchitecture := attributes["processorArchitecture"]
				if strings.Contains(processorArchitecture, "32-bit") {
					instance.Arch = append(instance.Arch, "i386")
				}
			}
		}
		networkPerformance := attributes["networkPerformance"]
		if networkPerformance != "NA" {
			instance.NetworkPerformance = networkPerformance
		}
	}

	if instance.Generation != "current" {
		// This if is here to stop a potential race condition if one DC
		// marks it as previous generation and another does not.
		if attributes["currentGeneration"] == "Yes" {
			instance.Generation = "current"
		} else {
			instance.Generation = "previous"
		}
	}

	gpu := attributes["gpu"]
	if gpu != "" {
		GPU, err := strconv.ParseFloat(gpu, 64)
		if err != nil {
			log.Fatal(err)
		}
		instance.GPU = GPU
	}
	if strings.Contains(instance.InstanceType, "inf") || strings.Contains(instance.InstanceType, "trn") {
		instance.GPU = 1
	}

	if hasApiDescription {
		if instance.FPGA == 0 {
			// Check if there's any FPGA's
			if apiDescription.FpgaInfo != nil {
				for _, fpga := range apiDescription.FpgaInfo.Fpgas {
					if fpga.Count != nil {
						instance.FPGA = int(*fpga.Count)
					}
				}
			}
		}

		if apiDescription.NetworkInfo != nil {
			if apiDescription.NetworkInfo.EnaSupport == "required" {
				instance.EBSAsNVMe = true
			}

			instance.VPC = &VPC{
				MaxENIs:   int(*apiDescription.NetworkInfo.MaximumNetworkInterfaces),
				IPsPerENI: int(*apiDescription.NetworkInfo.Ipv4AddressesPerInterface),
			}
		}

		if apiDescription.EbsInfo != nil {
			if apiDescription.EbsInfo.EbsOptimizedInfo != nil {
				ebsOptimizedInfo := apiDescription.EbsInfo.EbsOptimizedInfo
				instance.EBSOptimized = true
				instance.EBSBaselineThroughput = *ebsOptimizedInfo.BaselineThroughputInMBps
				instance.EBSBaselineIOPS = int(*ebsOptimizedInfo.BaselineIops)
				instance.EBSBaselineBandwidth = int(*ebsOptimizedInfo.BaselineBandwidthInMbps)
				instance.EBSThroughput = *ebsOptimizedInfo.MaximumThroughputInMBps
				instance.EBSIOPS = int(*ebsOptimizedInfo.MaximumIops)
				instance.EBSMaxBandwidth = int(*ebsOptimizedInfo.MaximumBandwidthInMbps)
			}
		}
	}

	ecu := attributes["ecu"]
	if ecu != "Variable" {
		ECU, err := strconv.ParseFloat(ecu, 64)
		if err == nil && ECU != 0 {
			instance.ECU = ECU
		}
	}

	processorFeatures := attributes["processorFeatures"]
	trueVal := true
	if strings.Contains(processorFeatures, "Intel AVX512") {
		instance.IntelAVX512 = &trueVal
	}
	if strings.Contains(processorFeatures, "Intel AVX2") {
		instance.IntelAVX2 = &trueVal
	}
	if strings.Contains(processorFeatures, "Intel AVX") {
		instance.IntelAVX = &trueVal
	}
	if strings.Contains(processorFeatures, "Intel Turbo") {
		instance.IntelTurbo = &trueVal
	}

	clockSpeed := attributes["clockSpeed"]
	if clockSpeed != "" {
		instance.ClockSpeedGhz = &clockSpeed
	}

	if instance.Generation == "current" && instance.InstanceType[:2] != "t2" {
		instance.EnhancedNetworking = true
	}

	if hasApiDescription {
		addInstanceStorageDetails(instance, apiDescription)
	}
}
