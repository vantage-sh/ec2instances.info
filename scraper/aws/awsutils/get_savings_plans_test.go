package awsutils

import (
	"testing"
)

func TestSavingsPlanTermSuffix(t *testing.T) {
	tests := []struct {
		productFamily string
		want          string
	}{
		{"EC2InstanceSavingsPlans", "InstanceSavings"},
		{"ComputeSavingsPlans", "Savings"},
		{"DatabaseSavingsPlans", "Savings"},
		{"SageMakerSavingsPlans", "Savings"},
	}
	for _, tc := range tests {
		if got := savingsPlanTermSuffix(tc.productFamily); got != tc.want {
			t.Errorf("savingsPlanTermSuffix(%q) = %q, want %q", tc.productFamily, got, tc.want)
		}
	}
}

func TestTranslateReservedTermAttributes(t *testing.T) {
	tests := []struct {
		purchaseTerm   string
		productFamily  string
		purchaseOption string
		want           string
	}{
		{"1yr", "ComputeSavingsPlans", "No Upfront", "yrTerm1Savings.noUpfront"},
		{"1yr", "EC2InstanceSavingsPlans", "No Upfront", "yrTerm1InstanceSavings.noUpfront"},
		{"3yr", "ComputeSavingsPlans", "All Upfront", "yrTerm3Savings.allUpfront"},
		{"3yr", "EC2InstanceSavingsPlans", "Partial Upfront", "yrTerm3InstanceSavings.partialUpfront"},
		{"1yr", "DatabaseSavingsPlans", "No Upfront", "yrTerm1Savings.noUpfront"},
	}
	for _, tc := range tests {
		got := translateReservedTermAttributes(tc.purchaseTerm, tc.productFamily, tc.purchaseOption)
		if got != tc.want {
			t.Errorf(
				"translateReservedTermAttributes(%q, %q, %q) = %q, want %q",
				tc.purchaseTerm,
				tc.productFamily,
				tc.purchaseOption,
				got,
				tc.want,
			)
		}
	}
}

// TestProcessSavingsPlanRegionKeepsBothFamilies ensures Compute and Instance
// Savings Plan rates for the same discounted EC2 SKU land on distinct term
// keys instead of overwriting each other, as they previously did
func TestProcessSavingsPlanRegionKeepsBothFamilies(t *testing.T) {
	const discountedSKU = "6C86BEPQVG73ZGGR"
	// Example SKU
	raw := RawSavingsPlanRegion{
		Products: []SavingsPlanProduct{
			{
				SKU: "COMPUTE_PLAN",
				Attributes: map[string]string{
					"productFamily":  "ComputeSavingsPlans",
					"purchaseTerm":   "1yr",
					"purchaseOption": "No Upfront",
				},
			},
			{
				SKU: "INSTANCE_PLAN",
				Attributes: map[string]string{
					"productFamily":  "EC2InstanceSavingsPlans",
					"purchaseTerm":   "1yr",
					"purchaseOption": "No Upfront",
					"instanceType":   "m5",
				},
			},
		},
	}
	raw.Terms.SavingsPlan = []SavingsPlanTerm{
		{
			SKU: "COMPUTE_PLAN",
			Rates: []SavingsPlanRate{
				{
					DiscountedSKU: discountedSKU,
					DiscountedRate: SavingsPlanDiscountedRate{
						Price:    "0.071",
						Currency: "USD",
					},
				},
			},
		},
		{
			SKU: "INSTANCE_PLAN",
			Rates: []SavingsPlanRate{
				{
					DiscountedSKU: discountedSKU,
					DiscountedRate: SavingsPlanDiscountedRate{
						Price:    "0.06",
						Currency: "USD",
					},
				},
			},
		},
	}

	got := map[string]float64{}
	processSavingsPlanRegion(raw, false, func(s sku, termKey term, price float64) {
		if s != discountedSKU {
			t.Fatalf("unexpected discounted sku %q", s)
		}
		got[string(termKey)] = price
	})

	if len(got) != 2 {
		t.Fatalf("got %d term keys, want 2: %#v", len(got), got)
	}
	if price, ok := got["yrTerm1Savings.noUpfront"]; !ok || !approxEqual(price, 0.071) {
		t.Errorf("Compute SP key = %v (ok=%v), want 0.071", price, ok)
	}
	if price, ok := got["yrTerm1InstanceSavings.noUpfront"]; !ok || !approxEqual(price, 0.06) {
		t.Errorf("Instance SP key = %v (ok=%v), want 0.06", price, ok)
	}
}
