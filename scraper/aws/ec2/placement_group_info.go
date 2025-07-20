package ec2

import "slices"

var PLACEMENT_GROUP_EXCEPTIONS = map[string]bool{
	"t2": true,
	"t3": true,
	"t4": true,
	"ma": true,
}

var PLACEMENT_GROUP_PREVIOUS_GENERATION_INSTANCES = []string{
	"cc2.8xlarge",
	"cr1.8xlarge",
	"hs1.8xlarge",
}

var PLACEMENT_GROUP_PREVIOUS_GENERATION_FAMILIES = []string{
	"a1",
	"c3",
	"g2",
	"i2",
	"r3",
}

func addPlacementGroupInfo(instances map[string]*EC2Instance) {
	for instanceType, instance := range instances {
		family := instanceType[0:2]
		if _, ok := PLACEMENT_GROUP_EXCEPTIONS[family]; ok {
			instance.PlacementGroupSupport = false
		} else if instance.Generation == "previous" &&
			!slices.Contains(PLACEMENT_GROUP_PREVIOUS_GENERATION_INSTANCES, instanceType) &&
			!slices.Contains(PLACEMENT_GROUP_PREVIOUS_GENERATION_FAMILIES, family) {
			instance.PlacementGroupSupport = false
		}
	}
}
