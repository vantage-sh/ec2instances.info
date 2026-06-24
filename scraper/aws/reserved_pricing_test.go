package aws

import (
	"math"
	"scraper/aws/awsutils"
	"testing"
)

// newReservedOffer builds a RegionTerm with the given hourly recurring fee and
// one-time upfront fee, mirroring how AWS structures reserved price dimensions
// ("Hrs" for the recurring fee, "Quantity" for the upfront fee).
func newReservedOffer(hourly, upfront string) awsutils.RegionTerm {
	dims := map[string]awsutils.RegionPriceDimension{}
	if hourly != "" {
		dims["hrs"] = awsutils.RegionPriceDimension{
			Unit:         "Hrs",
			PricePerUnit: map[string]string{"USD": hourly},
		}
	}
	if upfront != "" {
		dims["upfront"] = awsutils.RegionPriceDimension{
			Unit:         "Quantity",
			PricePerUnit: map[string]string{"USD": upfront},
		}
	}
	return awsutils.RegionTerm{PriceDimensions: dims}
}

func computeReserved(termCode, hourly, upfront string) float64 {
	pd := &genericAwsPricingData{Reserved: map[string]float64{}}
	processRDSAndElastiCacheReservedOffer(
		[]*genericAwsPricingData{pd},
		termCode,
		newReservedOffer(hourly, upfront),
		"USD",
	)
	return pd.Reserved[termCode]
}

func approxEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

// TestPartialUpfrontReservedNotUnderstated reproduces the ElastiCache pricing
// bug from issue #909 using the real AWS pricing for cache.r7g.large Valkey in
// ap-southeast-1. A Partial Upfront reserved offer combines a recurring hourly
// fee with an amortized upfront fee. The old code took the max of the two
// dimensions (after wrongly dividing the hourly fee), dropping the hourly fee
// entirely and producing a per-hour rate of ~0.0684 instead of the correct
// ~0.1364, which made Partial Upfront look cheaper than All Upfront.
func TestPartialUpfrontReservedNotUnderstated(t *testing.T) {
	const hoursPerMonth = 365.0 * 24 / 12

	onDemand := 0.2104

	// Real AWS reserved dimensions for the example instance.
	noUpfront1yr := computeReserved("yrTerm1Standard.noUpfront", "0.1432", "")
	partial1yr := computeReserved("yrTerm1Standard.partialUpfront", "0.0680", "599.0088")
	allUpfront1yr := computeReserved("yrTerm1Standard.allUpfront", "0.0000", "1179.5864")
	partial3yr := computeReserved("yrTerm3Standard.partialUpfront", "0.0504", "1327.0352")

	// Effective hourly rate = hourly fee + upfront/hoursInTerm.
	wantPartial1yr := 0.0680 + 599.0088/(1*365*24)
	if !approxEqual(partial1yr, wantPartial1yr) {
		t.Fatalf("1yr partial upfront effective hourly = %v, want %v", partial1yr, wantPartial1yr)
	}
	wantPartial3yr := 0.0504 + 1327.0352/(3*365*24)
	if !approxEqual(partial3yr, wantPartial3yr) {
		t.Fatalf("3yr partial upfront effective hourly = %v, want %v", partial3yr, wantPartial3yr)
	}

	// Every reserved rate must be cheaper than on demand.
	for name, v := range map[string]float64{
		"noUpfront1yr":  noUpfront1yr,
		"partial1yr":    partial1yr,
		"allUpfront1yr": allUpfront1yr,
	} {
		if v >= onDemand {
			t.Errorf("%s reserved hourly %v is not cheaper than on demand %v", name, v, onDemand)
		}
	}

	// Partial Upfront must sit between No Upfront and All Upfront, not below
	// All Upfront (the inverted ordering the bug produced).
	if !(allUpfront1yr <= partial1yr && partial1yr <= noUpfront1yr) {
		t.Errorf("1yr ordering broken: allUpfront=%v partial=%v noUpfront=%v",
			allUpfront1yr, partial1yr, noUpfront1yr)
	}

	// The buggy value was ~0.0684/hr (49.92/mo); the correct value is
	// ~0.1364/hr (~99.6/mo). Guard against regressing to the understated value.
	buggyMonthly := 0.0684 * hoursPerMonth
	correctMonthly := partial1yr * hoursPerMonth
	if correctMonthly <= buggyMonthly+1 {
		t.Errorf("1yr partial upfront monthly %v did not rise above the buggy value %v",
			correctMonthly, buggyMonthly)
	}
}

// TestAllUpfrontReservedAmortizesUpfront verifies an All Upfront offer (zero
// hourly fee) amortizes the upfront fee over the full lease.
func TestAllUpfrontReservedAmortizesUpfront(t *testing.T) {
	got := computeReserved("yrTerm3Standard.allUpfront", "0.0000", "2488.1904")
	want := 2488.1904 / (3 * 365 * 24)
	if !approxEqual(got, want) {
		t.Fatalf("3yr all upfront effective hourly = %v, want %v", got, want)
	}
}

// TestNoUpfrontReservedKeepsHourly verifies a No Upfront offer (single hourly
// dimension) is stored as-is.
func TestNoUpfrontReservedKeepsHourly(t *testing.T) {
	got := computeReserved("yrTerm1Standard.noUpfront", "0.1432", "")
	if !approxEqual(got, 0.1432) {
		t.Fatalf("1yr no upfront effective hourly = %v, want 0.1432", got)
	}
}

// TestGenericHalfReservedAmortizesPartialUpfront covers the OpenSearch/Redshift
// path (processGenericHalfReservedOffer), which shares the same amortization
// helper. It uses real AWS OpenSearch pricing for a Partial Upfront offer and
// confirms the hourly fee is summed with the amortized upfront fee rather than
// one dimension overwriting the other.
func TestGenericHalfReservedAmortizesPartialUpfront(t *testing.T) {
	offer := awsutils.RegionTerm{
		TermAttributes: map[string]string{
			"LeaseContractLength": "1yr",
			"PurchaseOption":      "Partial Upfront",
		},
		PriceDimensions: map[string]awsutils.RegionPriceDimension{
			"hrs": {
				Unit:         "Hrs",
				PricePerUnit: map[string]string{"USD": "0.8820"},
			},
			"upfront": {
				Unit:         "Quantity",
				PricePerUnit: map[string]string{"USD": "7730"},
			},
		},
	}
	pd := &genericAwsPricingData{Reserved: map[string]float64{}}
	processGenericHalfReservedOffer(offer, func() *genericAwsPricingData { return pd }, "USD")

	got := pd.Reserved["yrTerm1Standard.partialUpfront"]
	want := 0.8820 + 7730.0/(1*365*24)
	if !approxEqual(got, want) {
		t.Fatalf("1yr partial upfront effective hourly = %v, want %v", got, want)
	}
}
