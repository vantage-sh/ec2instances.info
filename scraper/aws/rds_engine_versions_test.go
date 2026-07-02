package aws

import (
	"testing"
)

func TestMajorVersion(t *testing.T) {
	cases := []struct {
		engine  string
		version string
		want    string
		ok      bool
	}{
		// PostgreSQL collapses the patch-suffixed string to the integer major.
		{"postgres", "11.22-rds.20241121", "11", true},
		{"postgres", "12.22", "12", true},
		{"postgres", "18.1", "18", true},
		{"aurora-postgresql", "16.9", "16", true},
		// MySQL / MariaDB keep major.minor (8.0 and 8.4 are distinct lines).
		{"mysql", "5.7.44-rds.20250213", "5.7", true},
		{"mysql", "8.0.39", "8.0", true},
		{"mysql", "8.4.9", "8.4", true},
		{"mariadb", "10.11.10", "10.11", true},
		{"mariadb", "11.8.8", "11.8", true},
		// Aurora MySQL stops at the leading numeric components.
		{"aurora-mysql", "5.7.mysql_aurora.2.11.1", "5.7", true},
		{"aurora-mysql", "8.0.mysql_aurora.3.12.0", "8.0", true},
		// Oracle uses the single leading major; the long suffix is dropped.
		{"oracle-ee", "19.0.0.0.ru-2020-04.rur-2020-04.r1", "19", true},
		{"oracle-se2-cdb", "21.0.0.0.ru-2024-01.rur-2024-01.r1", "21", true},
		// Db2 / DocumentDB / Neptune keep major.minor.
		{"db2-se", "11.5.9.0.sb00000000.r1", "11.5", true},
		{"db2-se", "12.1.4.0.sb00080714.r1", "12.1", true},
		{"docdb", "5.0.0", "5.0", true},
		{"neptune", "1.4.7.0", "1.4", true},
		// SQL Server maps the internal major to the marketing year.
		{"sqlserver-se", "13.00.6300.2.v1", "2016", true},
		{"sqlserver-ee", "16.00.4250.1.v1", "2022", true},
		{"custom-sqlserver-ee", "15.00.4345.5.v1", "2019", true},
		// An unmapped SQL Server major is skipped, not guessed.
		{"sqlserver-se", "12.00.6024.0.v1", "", false},
		// Garbage versions are skipped.
		{"postgres", "", "", false},
		{"mysql", "abc", "", false},
	}

	for _, c := range cases {
		got, ok := majorVersion(c.engine, c.version)
		if got != c.want || ok != c.ok {
			t.Errorf("majorVersion(%q, %q) = (%q, %v), want (%q, %v)",
				c.engine, c.version, got, ok, c.want, c.ok)
		}
	}
}

func TestCompareVersionTokens(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"9", "10", -1}, // numeric, not lexical
		{"10", "9", 1},
		{"11", "11", 0},
		{"8.0", "8.4", -1},
		{"8.4", "8.0", 1},
		{"11.5", "12.1", -1},
		{"2016", "2022", -1},
		{"8", "8.0", 0}, // missing trailing component counts as 0
	}
	for _, c := range cases {
		if got := compareVersionTokens(c.a, c.b); got != c.want {
			t.Errorf("compareVersionTokens(%q, %q) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestAddOrderableOptionComputesRanges(t *testing.T) {
	acc := make(map[string]map[string]*engineVersionRange)

	// One class with postgres rows spanning majors 11..16 (out of order, with
	// patch suffixes and duplicate storage-type rows) plus mysql 8.0 and 8.4.
	rows := []struct {
		class, engine, version string
	}{
		{"db.m5.large", "postgres", "13.21"},
		{"db.m5.large", "postgres", "11.22-rds.20241121"},
		{"db.m5.large", "postgres", "11.22-rds.20250220"}, // duplicate major 11
		{"db.m5.large", "postgres", "16.9"},
		{"db.m5.large", "mysql", "8.4.9"},
		{"db.m5.large", "mysql", "8.0.39"},
		// A second class with a single oracle major.
		{"db.r5.large", "oracle-ee", "19.0.0.0.ru-2024-01.rur-2024-01.r1"},
		// An unmapped SQL Server major must not create an entry.
		{"db.r5.large", "sqlserver-se", "12.00.6024.0.v1"},
	}
	for _, r := range rows {
		addOrderableOption(acc, r.class, r.engine, r.version)
	}

	pg := acc["db.m5.large"]["postgres"]
	if pg == nil || pg.Min != "11" || pg.Max != "16" {
		t.Errorf("postgres range = %+v, want {Min:11 Max:16}", pg)
	}
	my := acc["db.m5.large"]["mysql"]
	if my == nil || my.Min != "8.0" || my.Max != "8.4" {
		t.Errorf("mysql range = %+v, want {Min:8.0 Max:8.4}", my)
	}
	ora := acc["db.r5.large"]["oracle-ee"]
	if ora == nil || ora.Min != "19" || ora.Max != "19" {
		t.Errorf("oracle-ee range = %+v, want {Min:19 Max:19}", ora)
	}
	if _, ok := acc["db.r5.large"]["sqlserver-se"]; ok {
		t.Errorf("unmapped sqlserver-se major should be skipped, got %+v", acc["db.r5.large"]["sqlserver-se"])
	}
}
