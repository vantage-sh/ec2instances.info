package ec2

import (
	"log"
	"slices"
	"strings"
)


var POTENTIALLY_MISSING_LINUX_VIRTUALIZATION_TYPES = map[string][]string{
	"cc2": {"HVM"},
	"cg1": {"HVM"},
	"hi1": {"HVM", "PV"},
	"hs1": {"HVM", "PV"},
	"t1":  {"PV"},
	"m1":  {"PV"},
	"m2":  {"PV"},
	"c1":  {"PV"},
}

func addLinuxAmiInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding Linux AMI info to EC2")

	// https://aws.amazon.com/amazon-linux-ami/instance-type-matrix/ is dead
	// So this is removed for now

	for instanceType, instance := range instances {
		instanceSplit := strings.Split(instanceType, ".")
		if s, ok := POTENTIALLY_MISSING_LINUX_VIRTUALIZATION_TYPES[instanceSplit[0]]; ok {
			for _, virtualizationType := range s {
				if !slices.Contains(instance.LinuxVirtualizationTypes, virtualizationType) {
					instance.LinuxVirtualizationTypes = append(instance.LinuxVirtualizationTypes, virtualizationType)
				}
			}
		}
	}
}
