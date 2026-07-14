package ec2

import "testing"

func TestParsePublishedDate(t *testing.T) {
	tests := []struct {
		in   string
		want string
		ok   bool
	}{
		{"Aug 24, 2006", "2006-08-24", true},
		{"Oct 22, 2007", "2007-10-22", true},
		{"", "", false},
		{"not a date", "", false},
	}
	for _, tc := range tests {
		got, ok := parsePublishedDate(tc.in)
		if ok != tc.ok || got != tc.want {
			t.Errorf("parsePublishedDate(%q) = (%q, %v), want (%q, %v)", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

func TestDateFromReleaseMonthYear(t *testing.T) {
	got, ok := dateFromReleaseMonthYear("May", 2008)
	if !ok || got != "2008-05-01" {
		t.Errorf("dateFromReleaseMonthYear(May, 2008) = (%q, %v), want (2008-05-01, true)", got, ok)
	}

	got, ok = dateFromReleaseMonthYear("", 2008)
	if ok {
		t.Errorf("dateFromReleaseMonthYear(empty, 2008) = (%q, true), want false", got)
	}
}

func TestResolveIntroducedDatePrefersAnnouncement(t *testing.T) {
	entry := timelineEntry{
		ReleaseMonth: "May",
		ReleaseYear:  2008,
		Announcement: timelineSource{Published: strPtr("May 29, 2008")},
		BlogPost:     timelineSource{Published: strPtr("May 30, 2008")},
	}
	got, ok := resolveIntroducedDate(entry)
	if !ok || got != "2008-05-29" {
		t.Errorf("resolveIntroducedDate() = (%q, %v), want (2008-05-29, true)", got, ok)
	}
}

func TestResolveIntroducedDateFallsBackToBlogPost(t *testing.T) {
	entry := timelineEntry{
		ReleaseMonth: "May",
		ReleaseYear:  2008,
		BlogPost:     timelineSource{Published: strPtr("May 29, 2008")},
	}
	got, ok := resolveIntroducedDate(entry)
	if !ok || got != "2008-05-29" {
		t.Errorf("resolveIntroducedDate() = (%q, %v), want (2008-05-29, true)", got, ok)
	}
}

func TestResolveIntroducedDateFallsBackToReleaseMonthYear(t *testing.T) {
	entry := timelineEntry{
		ReleaseMonth: "May",
		ReleaseYear:  2008,
	}
	got, ok := resolveIntroducedDate(entry)
	if !ok || got != "2008-05-01" {
		t.Errorf("resolveIntroducedDate() = (%q, %v), want (2008-05-01, true)", got, ok)
	}
}

func TestDateIntroducedFallbackResolve(t *testing.T) {
	want := map[string]string{
		"c6gn.metal":         "2020-12-18",
		"i3p.16xlarge":       "2017-12-21",
		"i2.large":           "2013-12-19",
		"u-3tb1.56xlarge":    "2022-08-17",
		"u-18tb1.112xlarge":  "2022-10-25",
		"u-24tb1.112xlarge":  "2022-10-25",
		"p6e-gb200.36xlarge": "2025-07-09",
		"r8a.metal-24xl":     "2025-11-05",
		"r8a.metal-48xl":     "2025-11-05",
		"r7a.metal-48xl":     "2023-10-04",
		"p4de.24xlarge":      "2022-05-26",
		"d3en.large":         "2020-12-01",
		"mac2-m1ultra.metal": "2024-06-01",
	}
	for instanceType := range want {
		if _, ok := dateIntroducedFallback[instanceType]; !ok {
			t.Errorf("missing fallback for %s", instanceType)
		}
	}
	for instanceType, entry := range dateIntroducedFallback {
		expected, ok := want[instanceType]
		if !ok {
			t.Errorf("unexpected fallback %s (no expected date)", instanceType)
			continue
		}
		got, ok := resolveIntroducedDate(entry)
		if !ok || got != expected {
			t.Errorf("%s: resolveIntroducedDate() = (%q, %v), want (%q, true)", instanceType, got, ok, expected)
		}
	}
}
