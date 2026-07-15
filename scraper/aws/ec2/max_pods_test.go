package ec2

import (
	"strings"
	"testing"
)

// sampleMaxPodsDoc mirrors the real eni-max-pods.txt shape: a license/header
// comment block, ordinary "instance.type pods" data lines, and a trailing
// newline (which produces an empty final line after splitting on "\n").
const sampleMaxPodsDoc = `# Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
# Mapping is calculated from AWS EC2 API using the following formula:
#   # of ENI * (# of IPv4 per ENI - 1) + 2
#
a1.2xlarge 58
a1.4xlarge 234
a1.large 29
c5.xlarge 58
t3.small 11
`

func assertMaxPodsTable(t *testing.T, got map[string]int, want map[string]int) {
	t.Helper()

	if len(got) != len(want) {
		t.Fatalf("parsed %d entries, want %d: %+v", len(got), len(want), got)
	}

	for instanceType, wantPods := range want {
		gotPods, ok := got[instanceType]
		if !ok {
			t.Errorf("missing entry for %s", instanceType)
			continue
		}
		if gotPods != wantPods {
			t.Errorf("pods for %s = %d, want %d", instanceType, gotPods, wantPods)
		}
	}
}

func TestParseMaxPodsTable(t *testing.T) {
	got := parseMaxPodsTable([]byte(sampleMaxPodsDoc))
	want := map[string]int{
		"a1.2xlarge": 58,
		"a1.4xlarge": 234,
		"a1.large":   29,
		"c5.xlarge":  58,
		"t3.small":   11,
	}
	assertMaxPodsTable(t, got, want)
}

func TestParseMaxPodsTableSkipsCommentLines(t *testing.T) {
	got := parseMaxPodsTable([]byte(sampleMaxPodsDoc))
	for instanceType := range got {
		if strings.Contains(instanceType, "#") {
			t.Errorf("comment line leaked into results as key %q", instanceType)
		}
	}
}

func TestParseMaxPodsTableHandlesTrailingNewline(t *testing.T) {
	doc := []byte("c5.xlarge 58\n")
	got := parseMaxPodsTable(doc)
	want := map[string]int{"c5.xlarge": 58}
	assertMaxPodsTable(t, got, want)
}

func TestParseMaxPodsTableSkipsBlankLines(t *testing.T) {
	doc := []byte("c5.xlarge 58\n\n\nt3.small 11\n")
	got := parseMaxPodsTable(doc)
	want := map[string]int{"c5.xlarge": 58, "t3.small": 11}
	assertMaxPodsTable(t, got, want)
}

func TestParseMaxPodsTableSkipsMalformedLines(t *testing.T) {
	doc := []byte("c5.xlarge 58\nmalformed line here\nlonelytoken\nt3.small 11\n")
	got := parseMaxPodsTable(doc)
	want := map[string]int{"c5.xlarge": 58, "t3.small": 11}
	assertMaxPodsTable(t, got, want)
}

func TestParseMaxPodsTableSkipsNonNumericPods(t *testing.T) {
	doc := []byte("c5.xlarge fifty-eight\nt3.small 11\n")
	got := parseMaxPodsTable(doc)
	want := map[string]int{"t3.small": 11}
	assertMaxPodsTable(t, got, want)
}

func TestParseMaxPodsTableNoTable(t *testing.T) {
	// A doc with only comments and blank lines must yield an empty map, not
	// a panic.
	if got := parseMaxPodsTable([]byte("# just a comment\n\n")); len(got) != 0 {
		t.Errorf("expected no entries for a doc without data lines, got %+v", got)
	}
}

func TestParseMaxPodsTableDuplicateInstanceType(t *testing.T) {
	// If the same instance type appears twice, the later line wins (map
	// semantics)
	doc := []byte("c5.xlarge 58\nc5.xlarge 99\n")
	got := parseMaxPodsTable(doc)
	want := map[string]int{"c5.xlarge": 99}
	assertMaxPodsTable(t, got, want)
}

func TestValidateMaxPodsCountZero(t *testing.T) {
	if err := validateMaxPodsCount(0); err == nil {
		t.Error("expected an error for zero entries, got nil")
	}
}

func TestValidateMaxPodsCountBelowFloor(t *testing.T) {
	if err := validateMaxPodsCount(minExpectedEniMaxPodsEntries - 1); err == nil {
		t.Error("expected an error for a count just below the floor, got nil")
	}
}

func TestValidateMaxPodsCountAtFloor(t *testing.T) {
	if err := validateMaxPodsCount(minExpectedEniMaxPodsEntries); err != nil {
		t.Errorf("expected no error exactly at the floor, got %v", err)
	}
}

func TestValidateMaxPodsCountAboveFloor(t *testing.T) {
	if err := validateMaxPodsCount(minExpectedEniMaxPodsEntries + 500); err != nil {
		t.Errorf("expected no error comfortably above the floor, got %v", err)
	}
}
