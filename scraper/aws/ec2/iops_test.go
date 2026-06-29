package ec2

import "testing"

// sampleIopsDoc mirrors the shape of the AWS instance-type markdown docs: some
// prose, then an "Instance store specifications" table whose IOPS column is
// "Random read IOPS / Random write IOPS", interspersed with a family-header row
// and a row without IOPS data.
const sampleIopsDoc = `# Storage instances

Some intro text that should be ignored.

| Instance size | Instance store volumes | Random read IOPS / Random write IOPS |
| --- | --- | --- |
| Compute optimized | | |
| c7gd.medium | 1 x 59 GB NVMe SSD | 16,250 / 13,750 |
| c7gd.large | 1 x 118 GB NVMe SSD | 33,542 / 27,917 |
| m7gd.large | 1 x 118 GB NVMe SSD | 33,542 IOPS / 27,917 IOPS |
| no-iops.large | 1 x 100 GB NVMe SSD | |

Trailing prose ends the table.
`

func TestParseIopsTable(t *testing.T) {
	got := parseIopsTable(sampleIopsDoc)

	want := map[string]storageIops{
		"c7gd.medium": {readIops: 16250, writeIops: 13750},
		"c7gd.large":  {readIops: 33542, writeIops: 27917},
		"m7gd.large":  {readIops: 33542, writeIops: 27917},
	}

	if len(got) != len(want) {
		t.Fatalf("parsed %d entries, want %d: %+v", len(got), len(want), got)
	}
	for instanceType, wantIops := range want {
		gotIops, ok := got[instanceType]
		if !ok {
			t.Errorf("missing entry for %s", instanceType)
			continue
		}
		if gotIops != wantIops {
			t.Errorf("IOPS for %s = %+v, want %+v", instanceType, gotIops, wantIops)
		}
	}

	// Family-header rows, separator rows, and rows without IOPS data must be
	// skipped rather than producing fabricated entries.
	for _, skipped := range []string{"compute optimized", "no-iops.large"} {
		if _, ok := got[skipped]; ok {
			t.Errorf("expected %q to be skipped, but it was parsed", skipped)
		}
	}
}

func TestParseIopsTableNoTable(t *testing.T) {
	// A doc with no IOPS table must yield an empty map, not a panic.
	if got := parseIopsTable("# No table here\n\nJust prose.\n"); len(got) != 0 {
		t.Errorf("expected no entries for a doc without an IOPS table, got %+v", got)
	}
}
