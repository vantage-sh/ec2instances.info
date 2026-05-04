package aws

import (
	"math"
	"scraper/aws/awsutils"
	"strings"
)

// CostPerGb represents the per-GB-month storage cost for an instance.
// Baseline is the GB included with the instance at no per-GB cost. For
// AWS RDS / ElastiCache / Redshift / OpenSearch the pricing API does not
// expose any free-storage allowance (the AWS Free Tier is an account-level
// promotional benefit, not encoded in the pricing JSON), so Baseline is
// always 0 here. Other providers (EC2 instance store, Azure temp disk,
// GCP local SSD bundle) populate Baseline from instance metadata in their
// own scrapers without using this helper.
//
// Regions maps region slug -> per-GB-month rate. Values for Regions
// entries are emitted as scalars when uniform across platforms, or as a
// map[string]float64 (platform -> value) otherwise.
type CostPerGb struct {
	Baseline any            `json:"baseline"`
	Regions  map[string]any `json:"regions"`
}

// extractStorageRate inspects a PriceDimension and returns the per-GB-month
// rate if and only if the dimension's unit is "GB-Mo" (case-insensitive)
// and the dimension covers the lowest tier (BeginRange == "0" or empty).
//
// Tiered pricing is reduced to the lowest tier per the project decision.
// AWS storage SKUs in practice always have a single flat tier; the tier
// guard exists for safety.
func extractStorageRate(priceDim *awsutils.RegionPriceDimension, currency string) (rate float64, ok bool) {
	if priceDim == nil {
		return 0, false
	}
	if !strings.EqualFold(priceDim.Unit, "GB-Mo") {
		return 0, false
	}
	if priceDim.BeginRange != "" && priceDim.BeginRange != "0" {
		return 0, false
	}

	priceStr := priceDim.PricePerUnit[currency]
	if priceStr == "" {
		return 0, false
	}
	return awsutils.Floaty(priceStr), true
}

// collapseUniform returns either a scalar float64 (when all values in the
// map are equal within float64 tolerance) or the original map. An empty
// map collapses to float64(0), and a single-entry map collapses to its
// scalar value.
func collapseUniform(perPlatform map[string]float64) any {
	if len(perPlatform) == 0 {
		return float64(0)
	}
	var first float64
	firstSet := false
	uniform := true
	for _, v := range perPlatform {
		if !firstSet {
			first = v
			firstSet = true
			continue
		}
		if math.Abs(v-first) > 1e-12 {
			uniform = false
			break
		}
	}
	if uniform {
		return first
	}
	return perPlatform
}

// buildCostPerGb assembles a CostPerGb value from accumulated per-region,
// per-platform raw rate data. Baseline is always 0 because AWS pricing
// does not expose any free-storage allowance (see CostPerGb docs).
//
// When hasPlatform is false (Redshift/OpenSearch), the input map is
// expected to use a single sentinel platform key (typically ""); the
// helper emits scalars directly.
//
// Regions whose inner platform map is empty are dropped from the output.
func buildCostPerGb(
	ratesPerRegion map[string]map[string]float64,
	hasPlatform bool,
) CostPerGb {
	out := CostPerGb{
		Baseline: float64(0),
		Regions:  make(map[string]any),
	}

	if !hasPlatform {
		for region, perPlatform := range ratesPerRegion {
			if len(perPlatform) == 0 {
				continue
			}
			var v float64
			for _, vv := range perPlatform {
				v = vv
			}
			out.Regions[region] = v
		}
		return out
	}

	for region, perPlatform := range ratesPerRegion {
		if len(perPlatform) == 0 {
			continue
		}
		out.Regions[region] = collapseUniform(perPlatform)
	}
	return out
}
