package aws

import (
	"strings"
	"testing"
)

func TestOpenSearchSkipsExtendedSupportEnrichment(t *testing.T) {
	// Extended Support SKUs share instanceType but omit instanceFamily; enriching
	// them blanks family. processOpenSearchData only enriches ESInstance usagetypes.
	instance := map[string]any{
		"instance_type": "m5.large.search",
		"pricing":       map[string]*genericAwsPricingData{},
	}

	products := []map[string]string{
		{
			"instanceType":   "m5.large.search",
			"instanceFamily": "General purpose",
			"vcpu":           "2",
			"memoryGib":      "8 GiB",
			"usagetype":      "ESInstance:m5.large",
		},
		{
			"instanceType": "m5.large.search",
			"usagetype":    "EnhancedOSExtendedSupport:m5.large",
		},
	}

	for _, attrs := range products {
		if !strings.Contains(attrs["usagetype"], "ESInstance:") {
			continue
		}
		enrichOpenSearchInstance(instance, attrs)
	}

	if got := instance["family"]; got != "General purpose" {
		t.Fatalf("family = %v, want General purpose", got)
	}
}
