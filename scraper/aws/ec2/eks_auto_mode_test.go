package ec2

import (
	"scraper/aws/awsutils"
	"sync"
	"testing"
)

func TestApplyEksAutoModeRegion(t *testing.T) {
	instance := &EC2Instance{
		InstanceType: "m5.large",
		Pricing:      make(map[Region]map[OS]any),
	}
	instances := map[string]*EC2Instance{
		"m5.large": instance,
	}

	data := awsutils.RegionData{
		Products: map[string]awsutils.RegionProduct{
			"SKU1": {
				SKU:           "SKU1",
				ProductFamily: "Compute",
				Attributes: map[string]string{
					"eksproducttype": "AutoMode",
					"instancetype":   "m5.large",
					"regionCode":     "us-east-1",
				},
			},
			"SKU2": {
				SKU: "SKU2",
				Attributes: map[string]string{
					"eksproducttype": "Cluster",
					"instancetype":   "m5.large",
				},
			},
			"SKU3": {
				SKU: "SKU3",
				Attributes: map[string]string{
					"eksproducttype": "AutoMode",
					"instancetype":   "c5.xlarge", // not in instances map
				},
			},
		},
		Terms: awsutils.RegionTerms{
			OnDemand: map[string]map[string]awsutils.RegionTerm{
				"SKU1": {
					"TERM1": {
						SKU: "SKU1",
						PriceDimensions: map[string]awsutils.RegionPriceDimension{
							"DIM1": {
								Unit: "hours",
								PricePerUnit: map[string]string{
									"USD": "0.0115200000",
								},
							},
						},
					},
				},
				"SKU3": {
					"TERM1": {
						SKU: "SKU3",
						PriceDimensions: map[string]awsutils.RegionPriceDimension{
							"DIM1": {
								PricePerUnit: map[string]string{"USD": "0.02"},
							},
						},
					},
				},
			},
		},
	}

	var mu sync.Mutex
	applyEksAutoModeRegion(instances, "us-east-1", data, "USD", &mu)

	if !instance.EKSAutoMode {
		t.Fatal("expected EKSAutoMode flag to be set")
	}
	platform, ok := instance.Pricing["us-east-1"]["eks_auto_mode"].(*EC2PricingData)
	if !ok || platform == nil {
		t.Fatal("expected eks_auto_mode pricing platform")
	}
	if platform.EKSAutoMode != "0.01152" {
		t.Fatalf("EKSAutoMode = %q, want %q", platform.EKSAutoMode, "0.01152")
	}
	if platform.OnDemand != "" {
		t.Fatalf("OnDemand should stay empty for cleanEmptyRegions compatibility, got %q", platform.OnDemand)
	}
}

func TestApplyEksAutoModeRegionSkipsZero(t *testing.T) {
	instance := &EC2Instance{
		InstanceType: "m5.large",
		Pricing:      make(map[Region]map[OS]any),
	}
	instances := map[string]*EC2Instance{"m5.large": instance}

	data := awsutils.RegionData{
		Products: map[string]awsutils.RegionProduct{
			"SKU1": {
				SKU: "SKU1",
				Attributes: map[string]string{
					"eksproducttype": "AutoMode",
					"instancetype":   "m5.large",
				},
			},
		},
		Terms: awsutils.RegionTerms{
			OnDemand: map[string]map[string]awsutils.RegionTerm{
				"SKU1": {
					"TERM1": {
						PriceDimensions: map[string]awsutils.RegionPriceDimension{
							"DIM1": {PricePerUnit: map[string]string{"USD": "0"}},
						},
					},
				},
			},
		},
	}

	var mu sync.Mutex
	applyEksAutoModeRegion(instances, "us-east-1", data, "USD", &mu)

	if instance.EKSAutoMode {
		t.Fatal("zero-priced Auto Mode should not set flag")
	}
	if _, ok := instance.Pricing["us-east-1"]; ok {
		t.Fatal("zero-priced Auto Mode should not create pricing region")
	}
}
