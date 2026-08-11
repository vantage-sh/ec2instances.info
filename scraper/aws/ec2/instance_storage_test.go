package ec2

import (
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func TestAddInstanceStorageDetailsWithoutStorageInfo(t *testing.T) {
	instance := &EC2Instance{InstanceType: "m5.large"}

	addInstanceStorageDetails(instance, &types.InstanceTypeInfo{})

	if instance.Storage != nil {
		t.Errorf("expected no storage for an EBS-only instance, got %+v", instance.Storage)
	}
}

func TestAddInstanceStorageDetailsWithEmptyDisks(t *testing.T) {
	instance := &EC2Instance{InstanceType: "test.large"}
	apiDescription := &types.InstanceTypeInfo{
		InstanceStorageInfo: &types.InstanceStorageInfo{},
	}

	addInstanceStorageDetails(instance, apiDescription)

	if instance.Storage != nil {
		t.Errorf("expected no storage when the API reports no disks, got %+v", instance.Storage)
	}
}

func TestAddInstanceStorageDetailsWithNilDiskFields(t *testing.T) {
	instance := &EC2Instance{InstanceType: "test.large"}
	apiDescription := &types.InstanceTypeInfo{
		InstanceStorageInfo: &types.InstanceStorageInfo{
			Disks: []types.DiskInfo{{Type: types.DiskTypeSsd}},
		},
	}

	addInstanceStorageDetails(instance, apiDescription)

	if instance.Storage == nil {
		t.Fatal("expected storage to be recorded for a disk with missing count/size")
	}
	if instance.Storage.Devices != 0 || instance.Storage.Size != 0 {
		t.Errorf("expected zero devices/size for nil count/size, got %+v", instance.Storage)
	}
}

func TestAddInstanceStorageDetailsWithDisk(t *testing.T) {
	instance := &EC2Instance{InstanceType: "i3.large"}
	apiDescription := &types.InstanceTypeInfo{
		InstanceStorageInfo: &types.InstanceStorageInfo{
			NvmeSupport: types.EphemeralNvmeSupportRequired,
			Disks: []types.DiskInfo{{
				Count:    aws.Int32(2),
				SizeInGB: aws.Int64(1900),
				Type:     types.DiskTypeSsd,
			}},
		},
	}

	addInstanceStorageDetails(instance, apiDescription)

	if instance.Storage == nil {
		t.Fatal("expected storage to be recorded")
	}
	got := *instance.Storage
	want := Storage{
		SSD:         true,
		TrimSupport: true,
		NVMeSSD:     true,
		Devices:     2,
		Size:        1900,
		SizeUnit:    "GB",
	}
	if got != want {
		t.Errorf("storage mismatch:\n got  %+v\n want %+v", got, want)
	}
}
