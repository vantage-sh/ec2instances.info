package ec2

import (
	"scraper/utils"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func TestFormatClockSpeedFromMhz(t *testing.T) {
	tests := []struct {
		speedMhz uint
		want     string
	}{
		{2500, "2.5 GHz"},
		{2700, "2.7 GHz"},
		{3100, "3.1 GHz"},
	}
	for _, tc := range tests {
		if got := formatClockSpeedFromMhz(tc.speedMhz); got != tc.want {
			t.Errorf("formatClockSpeedFromMhz(%d) = %q, want %q", tc.speedMhz, got, tc.want)
		}
	}
}

func TestAddExtraDetailsSetsClockSpeedFromMeasuredData(t *testing.T) {
	instance := &EC2Instance{InstanceType: "m6g.medium"}
	instance.addExtraDetails()

	if instance.ClockSpeedGhz == nil {
		t.Fatal("ClockSpeedGhz is nil, want 2.5 GHz from measured extras data")
	}
	if *instance.ClockSpeedGhz != "2.5 GHz" {
		t.Errorf("ClockSpeedGhz = %q, want %q", *instance.ClockSpeedGhz, "2.5 GHz")
	}
}

func TestEnrichEc2InstancePrefersAwsClockSpeedOverExtras(t *testing.T) {
	instance := &EC2Instance{InstanceType: "m6g.medium"}
	instance.addExtraDetails()

	ec2ApiResponses := utils.NewSlowBuildingMap[string, *types.InstanceTypeInfo](func(pushChunk func(map[string]*types.InstanceTypeInfo)) {})
	enrichEc2Instance(instance, map[string]string{
		"instanceFamily": "General purpose",
		"vcpu":           "1",
		"memory":         "4 GiB",
		"clockSpeed":     "2.6 GHz",
		"ecu":            "Variable",
	}, ec2ApiResponses)

	if instance.ClockSpeedGhz == nil {
		t.Fatal("ClockSpeedGhz is nil")
	}
	if *instance.ClockSpeedGhz != "2.6 GHz" {
		t.Errorf("ClockSpeedGhz = %q, want AWS pricing value %q", *instance.ClockSpeedGhz, "2.6 GHz")
	}
}
