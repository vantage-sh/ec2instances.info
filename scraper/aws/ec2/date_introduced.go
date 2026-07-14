package ec2

import (
	"log"
	"scraper/utils"
	"strings"
	"time"
)

const instanceTimelineURL = "https://instancetyp.es/timeline.json"

type timelineSource struct {
	Published *string `json:"published"`
}

type timelineEntry struct {
	InstanceType string         `json:"instance_type"`
	ReleaseMonth string         `json:"release_month"`
	ReleaseYear  int            `json:"release_year"`
	Announcement timelineSource `json:"announcement"`
	BlogPost     timelineSource `json:"blog_post"`
}

type instanceTimeline struct {
	Release   string          `json:"release"`
	Instances []timelineEntry `json:"instances"`
}

var publishedDateLayouts = []string{
	"Jan 2, 2006",
	time.RFC3339,
}

func strPtr(s string) *string {
	return &s
}

/*
Manual fallback data for instance types missing from instancetyp.es/timeline.json.
*/
var dateIntroducedFallback = map[string]timelineEntry{
	// Metal size not listed in the family launch post, but same C6gn GA.
	// https://aws.amazon.com/about-aws/whats-new/2020/12/announcing-new-amazon-ec2-c6gn-instances-powered-by-aws-graviton2-processors-with-100-gbps-networking/
	"c6gn.metal": {
		ReleaseMonth: "December",
		ReleaseYear:  2020,
		Announcement: timelineSource{Published: strPtr("Dec 18, 2020")},
		BlogPost:     timelineSource{Published: strPtr("Dec 1, 2020")},
	},
	// Special bare-metal host used by VMware Cloud on AWS at initial availability.
	// https://aws.amazon.com/blogs/apn/securing-workloads-on-vmware-cloud-on-aws-using-native-aws-services/
	"i3p.16xlarge": {
		ReleaseMonth: "December",
		ReleaseYear:  2017,
		BlogPost:     timelineSource{Published: strPtr("Dec 21, 2017")},
	},
	// Listed in the I2 coming-soon post; same family dates as other i2 sizes.
	// https://aws.amazon.com/blogs/aws/amazon-ec2-new-i2-instance-type-available-now/
	// https://aws.amazon.com/about-aws/whats-new/2013/12/19/o-instance/
	"i2.large": {
		ReleaseMonth: "December",
		ReleaseYear:  2013,
		Announcement: timelineSource{Published: strPtr("Dec 19, 2013")},
		BlogPost:     timelineSource{Published: strPtr("Dec 20, 2013")},
	},
	// Earliest What's New that names u-3tb1.56xlarge (already available in other regions by then).
	// https://aws.amazon.com/about-aws/whats-new/2022/08/amazon-ec2-high-memory-instances-ohio-sao-paulo-sydney-regions/
	"u-3tb1.56xlarge": {
		ReleaseMonth: "August",
		ReleaseYear:  2022,
		Announcement: timelineSource{Published: strPtr("Aug 17, 2022")},
	},
	// Virtualized 18/24 TiB sizes announced for On-Demand / Savings Plans.
	// https://aws.amazon.com/about-aws/whats-new/2022/10/ec2-high-memory-instances-18tib-24tib-memory-available-on-demand-savings-plan-purchase-options/
	"u-18tb1.112xlarge": {
		ReleaseMonth: "October",
		ReleaseYear:  2022,
		Announcement: timelineSource{Published: strPtr("Oct 25, 2022")},
	},
	"u-24tb1.112xlarge": {
		ReleaseMonth: "October",
		ReleaseYear:  2022,
		Announcement: timelineSource{Published: strPtr("Oct 25, 2022")},
	},
	// https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-p6e-gb200-ultraservers-gpu-performance-ec2/
	// https://aws.amazon.com/blogs/aws/new-amazon-ec2-p6e-gb200-ultraservers-powered-by-nvidia-grace-blackwell-gpus-for-the-highest-ai-performance/
	"p6e-gb200.36xlarge": {
		ReleaseMonth: "July",
		ReleaseYear:  2025,
		Announcement: timelineSource{Published: strPtr("Jul 9, 2025")},
		BlogPost:     timelineSource{Published: strPtr("Jul 9, 2025")},
	},
	// Family launch explicitly includes 2 bare metal sizes.
	// https://aws.amazon.com/about-aws/whats-new/2025/11/memory-optimized-amazon-ec2-r8a-instances/
	"r8a.metal-24xl": {
		ReleaseMonth: "November",
		ReleaseYear:  2025,
		Announcement: timelineSource{Published: strPtr("Nov 5, 2025")},
	},
	"r8a.metal-48xl": {
		ReleaseMonth: "November",
		ReleaseYear:  2025,
		Announcement: timelineSource{Published: strPtr("Nov 5, 2025")},
	},
	// https://aws.amazon.com/about-aws/whats-new/2023/10/memory-optimized-amazon-ec2-r7a-bare-metal-instances/
	"r7a.metal-48xl": {
		ReleaseMonth: "October",
		ReleaseYear:  2023,
		Announcement: timelineSource{Published: strPtr("Oct 4, 2023")},
	},
	// https://aws.amazon.com/about-aws/whats-new/2022/05/amazon-ec2-p4de-gpu-instances-ml-training-hpc/
	"p4de.24xlarge": {
		ReleaseMonth: "May",
		ReleaseYear:  2022,
		Announcement: timelineSource{Published: strPtr("May 26, 2022")},
	},
	// .large not in the original size table; use family GA sources.
	// https://aws.amazon.com/about-aws/whats-new/2020/12/introducing-amazon-ec2-d3-and-d3en-the-next-generation-of-dense-hdd-storage-instances/
	// https://aws.amazon.com/blogs/aws/ec2-update-d3-d3en-dense-storage-instances/
	"d3en.large": {
		ReleaseMonth: "December",
		ReleaseYear:  2020,
		Announcement: timelineSource{Published: strPtr("Dec 1, 2020")},
		BlogPost:     timelineSource{Published: strPtr("Dec 1, 2020")},
	},
	// No dedicated What's New; AWS instance-types doc history lists June 17, 2024.
	// https://docs.aws.amazon.com/ec2/latest/instancetypes/doc-history.html
	"mac2-m1ultra.metal": {
		ReleaseMonth: "June",
		ReleaseYear:  2024,
	},
}

func parsePublishedDate(s string) (string, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", false
	}
	for _, layout := range publishedDateLayouts {
		t, err := time.Parse(layout, s)
		if err == nil {
			return t.Format("2006-01-02"), true
		}
	}
	return "", false
}

func dateFromReleaseMonthYear(month string, year int) (string, bool) {
	if month == "" || year == 0 {
		return "", false
	}
	t, err := time.Parse("January", month)
	if err != nil {
		return "", false
	}
	return time.Date(year, t.Month(), 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02"), true
}

func resolveIntroducedDate(entry timelineEntry) (string, bool) {
	if entry.Announcement.Published != nil {
		if d, ok := parsePublishedDate(*entry.Announcement.Published); ok {
			return d, true
		}
	}
	if entry.BlogPost.Published != nil {
		if d, ok := parsePublishedDate(*entry.BlogPost.Published); ok {
			return d, true
		}
	}
	return dateFromReleaseMonthYear(entry.ReleaseMonth, entry.ReleaseYear)
}

func addDateIntroduced(instances map[string]*EC2Instance) {
	log.Default().Println("Adding date introduced info to EC2")

	byType := make(map[string]timelineEntry, len(instances)+len(dateIntroducedFallback))

	var timeline instanceTimeline
	if err := utils.LoadJson(instanceTimelineURL, &timeline); err != nil {
		utils.SendWarning("Failed to fetch instance timeline:", err)
	} else {
		// Add the json results to byType
		log.Default().Printf("Loaded instance timeline release %s", timeline.Release)
		for _, entry := range timeline.Instances {
			byType[entry.InstanceType] = entry
		}
	}

	for instanceType, instance := range instances {
		entry, ok := byType[instanceType]
		if !ok {
			fallback, ok := dateIntroducedFallback[instanceType]
			if !ok {
				utils.SendWarning("Date introduced data missing for", instanceType)
				continue
			}
			entry = fallback
		}
		if d, ok := resolveIntroducedDate(entry); ok {
			instance.DateIntroduced = &d
		} else {
			utils.SendWarning("Date introduced could not be parsed for", instanceType)
		}
	}
}
