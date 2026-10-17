package ec2

import (
	"scraper/aws/awsutils"
	"testing"

	"github.com/anaskhan96/soup"
)

func t2CreditsTestHTML() *soup.Root {
	html := `
<html><body>
<div class="table-contents"><table><tbody>
<tr><td>T8i</td><td></td></tr>
</tbody></table></div>
<div class="table-contents"><table><tbody>
<tr><td>t3.nano</td><td>6</td></tr>
<tr><td>t8i.nano</td><td>6</td></tr>
<tr><td>t8i.micro</td><td>12</td></tr>
<tr><td>t8i.small</td><td>24</td></tr>
<tr><td>t8i.medium</td><td>24</td></tr>
</tbody></table></div>
</body></html>`
	root := soup.HTMLParse(html)
	return &root
}

func TestAddT2CreditsAppliesKnownTypes(t *testing.T) {
	instance := &EC2Instance{
		InstanceType: "t3.nano",
		VCPU:         awsutils.Averager[int]{2},
	}
	instances := map[string]*EC2Instance{
		"t3.nano": instance,
	}

	addT2Credits(instances, t2CreditsTestHTML, true)

	if instance.BasePerformance == nil || *instance.BasePerformance != 0.1 {
		t.Fatalf("BasePerformance = %v, want 0.1", instance.BasePerformance)
	}
	if instance.BurstMinutes == nil || *instance.BurstMinutes != 72 {
		t.Fatalf("BurstMinutes = %v, want 72", instance.BurstMinutes)
	}
}

func TestAddT2CreditsSkipsUnknownTypesInChina(t *testing.T) {
	// China pricing does not include t8i yet, but the shared global docs do.
	// This must not panic/fatal; unknown rows are ignored for china=true.
	instances := map[string]*EC2Instance{
		"t3.nano": {
			InstanceType: "t3.nano",
			VCPU:         awsutils.Averager[int]{2},
		},
	}

	addT2Credits(instances, t2CreditsTestHTML, true)

	if instances["t3.nano"].BasePerformance == nil {
		t.Fatal("expected t3.nano credits to still be applied in China scrape")
	}
	for _, instanceType := range []string{"t8i.nano", "t8i.micro", "t8i.small", "t8i.medium"} {
		if _, ok := instances[instanceType]; ok {
			t.Fatalf("did not expect %s to be created from credits docs", instanceType)
		}
	}
}
