package ec2

import "testing"

func TestShouldIncludeEC2PricingSku(t *testing.T) {
	tests := []struct {
		platform     string
		licenseModel string
		want         bool
	}{
		{"linux", "", true},
		{"linux", "No License required", true},
		{"mswin", "No License required", true},
		{"mswinSQLWeb", "No License required", true},
		{"mswin", "Bring your own license", false},
		{"mswin", "License Included - Infrastructure", false},
		{"mswinSQL", "Bring your own license", false},
	}
	for _, tc := range tests {
		if got := shouldIncludeEC2PricingSku(tc.platform, tc.licenseModel); got != tc.want {
			t.Errorf(
				"shouldIncludeEC2PricingSku(%q, %q) = %v, want %v",
				tc.platform,
				tc.licenseModel,
				got,
				tc.want,
			)
		}
	}
}

func TestSkuOnDemandMatchesPlatform(t *testing.T) {
	tests := []struct {
		skuOnDemand        float64
		platformOnDemand   string
		want               bool
	}{
		{0.056, "0.056", true},
		{0.056, "0.056000", true},
		{0.046, "0.056", false},
		{0, "0.056", true},
		{0.056, "0", true},
		{0.056, "bad", true},
	}
	for _, tc := range tests {
		if got := skuOnDemandMatchesPlatform(tc.skuOnDemand, tc.platformOnDemand); got != tc.want {
			t.Errorf(
				"skuOnDemandMatchesPlatform(%v, %q) = %v, want %v",
				tc.skuOnDemand,
				tc.platformOnDemand,
				got,
				tc.want,
			)
		}
	}
}
