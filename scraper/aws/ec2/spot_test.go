package ec2

import "testing"

func spotAdvisorFixture(r int) func() *spotDataPartial {
	return func() *spotDataPartial {
		return &spotDataPartial{
			SpotAdvisor: map[string]map[string]map[string]spotAdvisorData{
				"us-east-1": {
					"Linux": {
						"m5.large": {S: 60, R: r},
					},
				},
			},
		}
	}
}

func spotTestInstances() (map[string]*EC2Instance, *EC2PricingData) {
	linux := &EC2PricingData{OnDemand: "0.096"}
	instances := map[string]*EC2Instance{
		"m5.large": {
			InstanceType: "m5.large",
			Pricing: map[Region]map[OS]any{
				"us-east-1": {"linux": linux},
			},
		},
	}
	return instances, linux
}

func TestAddSpotInterruptInfoMapsEveryRValue(t *testing.T) {
	for r, want := range R_VALUES_MAPPING {
		instances, linux := spotTestInstances()
		addSpotInterruptInfo(instances, spotAdvisorFixture(r), false)

		if linux.PCTInterrupt != want {
			t.Errorf("r=%d: PCTInterrupt = %q, want %q", r, linux.PCTInterrupt, want)
		}
		if linux.PCTSavingsOD == nil || *linux.PCTSavingsOD != 60 {
			t.Errorf("r=%d: PCTSavingsOD = %v, want 60", r, linux.PCTSavingsOD)
		}
	}
}

func TestAddSpotInterruptInfoSkipsUnknownRValue(t *testing.T) {
	for _, r := range []int{-1, len(R_VALUES_MAPPING), len(R_VALUES_MAPPING) + 1} {
		instances, linux := spotTestInstances()
		func() {
			defer func() {
				if p := recover(); p != nil {
					t.Errorf("r=%d: addSpotInterruptInfo panicked: %v", r, p)
				}
			}()
			addSpotInterruptInfo(instances, spotAdvisorFixture(r), false)
		}()

		if linux.PCTInterrupt != "" || linux.PCTSavingsOD != nil || linux.SpotAvg != 0 {
			t.Errorf("r=%d: pricing changed for an unknown R value: %+v", r, *linux)
		}
	}
}

func TestAddSpotInterruptInfoEstimatesSpotAvgOnlyWhenMissing(t *testing.T) {
	instances, linux := spotTestInstances()
	addSpotInterruptInfo(instances, spotAdvisorFixture(0), false)
	if got, want := float64(linux.SpotAvg), 0.4*0.096; got < want-1e-9 || got > want+1e-9 {
		t.Errorf("estimated SpotAvg = %v, want %v", got, want)
	}

	instances, linux = spotTestInstances()
	linux.SpotAvg = 0.05
	addSpotInterruptInfo(instances, spotAdvisorFixture(0), false)
	if linux.SpotAvg != 0.05 {
		t.Errorf("SpotAvg from spot price history was overwritten: %v", linux.SpotAvg)
	}
}
