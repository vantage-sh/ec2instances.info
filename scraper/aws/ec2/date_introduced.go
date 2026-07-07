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

	var timeline instanceTimeline
	if err := utils.LoadJson(instanceTimelineURL, &timeline); err != nil {
		utils.SendWarning("Failed to fetch instance timeline:", err)
		return
	}

	log.Default().Printf("Loaded instance timeline release %s", timeline.Release)

	byType := make(map[string]timelineEntry, len(timeline.Instances))
	for _, entry := range timeline.Instances {
		byType[entry.InstanceType] = entry
	}

	for instanceType, instance := range instances {
		entry, ok := byType[instanceType]
		if !ok {
			utils.SendWarning("Date introduced data missing for", instanceType)
			continue
		}
		if d, ok := resolveIntroducedDate(entry); ok {
			instance.DateIntroduced = &d
		} else {
			utils.SendWarning("Date introduced could not be parsed for", instanceType)
		}
	}
}
