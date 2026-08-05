package aws

import (
	"scraper/aws/awsutils"
	"scraper/utils"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

func TestIsValidSageMakerSku(t *testing.T) {
	tests := []struct {
		name       string
		product    awsutils.RegionProduct
		wantName   string
		wantOK     bool
	}{
		{
			name: "notebook instance",
			product: awsutils.RegionProduct{
				ProductFamily: sageMakerProductFamily,
				Attributes: map[string]string{
					"instanceName":  "ml.m5.xlarge",
					"locationType":  "AWS Region",
					"component":     "Notebook",
				},
			},
			wantName: "ml.m5.xlarge",
			wantOK:   true,
		},
		{
			name: "wrong product family",
			product: awsutils.RegionProduct{
				ProductFamily: "ML Serverless",
				Attributes: map[string]string{
					"instanceName": "ml.m5.xlarge",
					"locationType": "AWS Region",
				},
			},
			wantOK: false,
		},
		{
			name: "serverless fine-tuning sku",
			product: awsutils.RegionProduct{
				ProductFamily: sageMakerProductFamily,
				Attributes: map[string]string{
					"locationType": "AWS Region",
					"component":    "ServerlessTraining:FineTuning",
					"modelname":    "some-model",
				},
			},
			wantOK: false,
		},
		{
			name: "non-regional location",
			product: awsutils.RegionProduct{
				ProductFamily: sageMakerProductFamily,
				Attributes: map[string]string{
					"instanceName": "ml.m5.xlarge",
					"locationType": "AWS Outposts",
				},
			},
			wantOK: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotName, gotOK := isValidSageMakerSku(tc.product)
			if gotOK != tc.wantOK {
				t.Fatalf("ok = %v, want %v", gotOK, tc.wantOK)
			}
			if gotName != tc.wantName {
				t.Fatalf("instanceName = %q, want %q", gotName, tc.wantName)
			}
		})
	}
}

func TestIsNotebookSageMakerSku(t *testing.T) {
	notebook := awsutils.RegionProduct{
		ProductFamily: sageMakerProductFamily,
		Attributes: map[string]string{
			"instanceName": "ml.m5.xlarge",
			"locationType": "AWS Region",
			"component":    sageMakerNotebookComponent,
		},
	}
	if name, ok := isNotebookSageMakerSku(notebook); !ok || name != "ml.m5.xlarge" {
		t.Fatalf("notebook sku: got (%q, %v)", name, ok)
	}

	processing := notebook
	processing.Attributes = map[string]string{
		"instanceName": "ml.m5.xlarge",
		"locationType": "AWS Region",
		"component":    "Processing",
	}
	if _, ok := isNotebookSageMakerSku(processing); ok {
		t.Fatal("processing sku should be skipped")
	}
}

func TestSageMakerPrettyName(t *testing.T) {
	tests := []struct {
		instanceName InstanceName
		want         string
	}{
		{"ml.m5.xlarge", "M5 General Purpose Extra Large"},
		{"ml.g4dn.12xlarge", "G4dn Graphics and Machine Learning GPU 12xlarge Extra Large"},
		{"ml.p4d.24xlarge", "P4d Highest Performance GPU 24xlarge"},
	}
	for _, tc := range tests {
		if got := sageMakerPrettyName(tc.instanceName); got != tc.want {
			t.Errorf("sageMakerPrettyName(%q) = %q, want %q", tc.instanceName, got, tc.want)
		}
	}
}

func TestEnrichSageMakerInstance(t *testing.T) {
	ec2InstanceTypes := utils.NewSlowBuildingMap(func(push func(map[string]*types.InstanceTypeInfo)) {
		push(map[string]*types.InstanceTypeInfo{})
	})

	instance := &SageMakerInstance{
		InstanceType: "ml.m5.xlarge",
		Family:       "m5",
		Pricing:      make(map[string]*genericAwsPricingData),
	}
	pricingAttributes := map[string]string{
		"instanceName":       "ml.m5.xlarge",
		"platoinstancename":  "m5",
		"instanceFamily":     "General purpose",
		"vCpu":               "4",
		"memory":             "16 GiB",
		"networkPerformance": "Up to 10 Gigabit",
		"gpu":                "0",
		"component":          "Notebook",
		"location":           "US East (N. Virginia)",
	}

	enrichSageMakerInstance(instance, pricingAttributes, ec2InstanceTypes)

	if instance.InstanceType != "ml.m5.xlarge" {
		t.Fatalf("instance_type = %v, want ml.m5.xlarge", instance.InstanceType)
	}
	if instance.Family != "m5" {
		t.Fatalf("family = %v, want m5", instance.Family)
	}
	if instance.ComputeFamily != "General purpose" {
		t.Fatalf("compute_family = %v, want General purpose", instance.ComputeFamily)
	}
	if instance.NetworkPerformance != "Up to 10 Gigabit" {
		t.Fatalf("network_performance = %v", instance.NetworkPerformance)
	}
	if instance.VCPU != 4.0 {
		t.Fatalf("vCPU = %v, want 4", instance.VCPU)
	}
	if instance.Memory != 16.0 {
		t.Fatalf("memory = %v, want 16", instance.Memory)
	}
	if instance.GPU != 0.0 {
		t.Fatalf("GPU = %v, want 0", instance.GPU)
	}
	if instance.GPUModel != nil {
		t.Fatalf("GPU_model = %v, want nil", instance.GPUModel)
	}
}

func TestEnrichSageMakerInstanceGPU(t *testing.T) {
	ec2InstanceTypes := utils.NewSlowBuildingMap(func(push func(map[string]*types.InstanceTypeInfo)) {
		push(map[string]*types.InstanceTypeInfo{})
	})

	tests := []struct {
		name         string
		instanceType string
		pricingGPU   string
		wantGPU      float64
		wantModel    string
	}{
		{
			name:         "gpu instance",
			instanceType: "ml.g4dn.xlarge",
			pricingGPU:   "1",
			wantGPU:      1,
			wantModel:    "NVIDIA T4 Tensor Core",
		},
		{
			name:         "neuron instance",
			instanceType: "ml.inf1.xlarge",
			pricingGPU:   "0",
			wantGPU:      0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			instance := &SageMakerInstance{
				InstanceType: tc.instanceType,
				Pricing:      make(map[string]*genericAwsPricingData),
			}
			enrichSageMakerInstance(instance, map[string]string{"gpu": tc.pricingGPU}, ec2InstanceTypes)

			if instance.GPU != tc.wantGPU {
				t.Fatalf("GPU = %v, want %v", instance.GPU, tc.wantGPU)
			}
			if tc.wantModel == "" {
				if instance.GPUModel != nil {
					t.Fatalf("GPU_model = %v, want nil", instance.GPUModel)
				}
				return
			}
			if instance.GPUModel == nil || *instance.GPUModel != tc.wantModel {
				t.Fatalf("GPU_model = %v, want %q", instance.GPUModel, tc.wantModel)
			}
		})
	}
}

func TestNewSageMakerInstance(t *testing.T) {
	instance := newSageMakerInstance("ml.m5.xlarge", "m5")
	if instance.InstanceType != "ml.m5.xlarge" {
		t.Fatalf("instance_type = %q", instance.InstanceType)
	}
	if instance.PrettyName != "M5 General Purpose Extra Large" {
		t.Fatalf("pretty_name = %q", instance.PrettyName)
	}
	if instance.Family != "m5" {
		t.Fatalf("family = %q", instance.Family)
	}
	if instance.Pricing == nil {
		t.Fatal("pricing should be initialized")
	}
}
