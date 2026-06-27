package ec2

import (
	"scraper/aws/awsutils"
	"testing"
)

// TestDedicatedHostInstanceTypeMatches guards against the prefix-matching bug
// from issue #896 (follow-up to #893): Dedicated Host SKU names are frequently
// prefixes of one another (e.g. "mac2" of "mac2-m1ultra", "mac-m4" of
// "mac-m4max", "m5" of "m5d"), so a strings.HasPrefix-based match let the wrong
// SKU's price overwrite an instance's price. Matching must be on the exact
// family base (the part before the first ".") of the instance type.
func TestDedicatedHostInstanceTypeMatches(t *testing.T) {
	cases := []struct {
		instanceType string
		sku          string
		want         bool
	}{
		// Exact family matches.
		{"mac2.metal", "mac2", true},
		{"mac2-m1ultra.metal", "mac2-m1ultra", true},
		{"mac-m4max.metal", "mac-m4max", true},
		{"m5d.metal", "m5d", true},

		// The buggy prefix collisions that must NOT match.
		{"mac2-m1ultra.metal", "mac2", false},
		{"mac2-m2.metal", "mac2", false},
		{"mac2-m2pro.metal", "mac2", false},
		{"mac2-m2pro.metal", "mac2-m2", false},
		{"mac-m4max.metal", "mac-m4", false},
		{"mac-m4pro.metal", "mac-m4", false},
		{"m5d.metal", "m5", false},
		{"m5dn.metal", "m5d", false},

		// A SKU must never match a longer instance family.
		{"mac2.metal", "mac2-m1ultra", false},
	}
	for _, c := range cases {
		if got := dedicatedHostInstanceTypeMatches(c.instanceType, c.sku); got != c.want {
			t.Errorf("dedicatedHostInstanceTypeMatches(%q, %q) = %v, want %v",
				c.instanceType, c.sku, got, c.want)
		}
	}
}

// TestDedicatedHostOnDemandAssignment replicates the real us-east-1 Mac
// Dedicated Host on-demand assignment loop and asserts every Mac instance ends
// up with its correct AWS price regardless of SKU iteration order. With the old
// strings.HasPrefix match, the "mac2" SKU ($0.65) would overwrite
// mac2-m1ultra.metal ($5.00), mac2-m2.metal ($0.878) and mac2-m2pro.metal
// ($1.56), and the "mac-m4" SKU ($1.23) would overwrite mac-m4max.metal ($6.25)
// and mac-m4pro.metal ($1.97), depending on Go map iteration order.
func TestDedicatedHostOnDemandAssignment(t *testing.T) {
	const region = "us-east-1"

	// Authoritative us-east-1 prices from the AWS Dedicated Host on-demand
	// pricing feed (dedicatedhost-ondemand.json).
	skuPrices := map[string]string{
		"mac1":         "1.083",
		"mac2":         "0.65",
		"mac2-m1ultra": "5.0",
		"mac2-m2":      "0.878",
		"mac2-m2pro":   "1.56",
		"mac-m3ultra":  "12.5",
		"mac-m4":       "1.23",
		"mac-m4max":    "6.25",
		"mac-m4pro":    "1.97",
	}

	// want maps each instance type to the formatted price it must receive.
	want := map[string]string{}
	instances := map[string]*EC2Instance{}
	for sku, price := range skuPrices {
		it := sku + ".metal"
		instances[it] = &EC2Instance{
			InstanceType: it,
			Pricing:      make(map[Region]map[OS]any),
		}
		want[it] = formatPrice(awsutils.Floaty(price))
	}

	// Replicate the assignment loop from addDedicatedHostPricingUs. We assign
	// every SKU to every matching instance, mirroring the scraper.
	for sku, price := range skuPrices {
		for instanceType, instance := range instances {
			if dedicatedHostInstanceTypeMatches(instanceType, sku) {
				addDedicatedHostOnDemandPrice(instance, region, price)
			}
		}
	}

	for it, instance := range instances {
		dedicated, ok := instance.Pricing[region]["dedicated"].(*EC2PricingData)
		if !ok {
			t.Fatalf("%s: no dedicated pricing assigned", it)
		}
		if dedicated.OnDemand != want[it] {
			t.Errorf("%s: on-demand price = %s, want %s", it, dedicated.OnDemand, want[it])
		}
	}
}
