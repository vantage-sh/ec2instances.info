package ec2

import "strings"

// A few legacy instances can be launched in EC2 Classic, the rest is VPC only
// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-classic-platform.html#ec2-classic-instance-types
var LEGACY_INSTANCE_TYPES = []string{
	"m1",
	"m3",
	"t1",
	"c1",
	"c3",
	"cc2",
	"cr1",
	"m2",
	"r3",
	"d2",
	"hs1",
	"i2",
	"g2",
}

func addVpcOnlyInstances(instances map[string]*EC2Instance) {
	for instanceType, instance := range instances {
		for _, family := range LEGACY_INSTANCE_TYPES {
			if strings.HasPrefix(instanceType, family) {
				instance.VpcOnly = false
				break
			}
		}
	}
}
