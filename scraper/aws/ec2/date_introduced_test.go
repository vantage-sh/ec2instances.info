package ec2

import "testing"

func strPtr(s string) *string {
	return &s
}

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
