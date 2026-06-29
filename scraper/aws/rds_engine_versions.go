package aws

import (
	"context"
	"log"
	"strconv"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/rds"
)

// RDS_ENGINE_SUPPORT_REGION is the single region queried for the supported
// engine version ranges (issue #710). v1 is intentionally scoped to one region:
// DescribeOrderableDBInstanceOptions paginates heavily (one engine is tens of
// thousands of rows) and the cross-region variance is almost entirely about
// newer instance classes rolling out region by region rather than about which
// engine versions an established class supports. us-east-1 has the widest
// coverage, so it is the representative region. Widening to a small region set
// (union) is a possible v2.
const RDS_ENGINE_SUPPORT_REGION = "us-east-1"

// engineVersionRange is the compact per-engine major-version span attached to
// each RDS instance class as engine_support[engine]. min/max are the collapsed
// major (or major.minor) version tokens, not the raw patch-level strings.
type engineVersionRange struct {
	Min string `json:"min"`
	Max string `json:"max"`
}

// sqlServerMajorToYear maps the SQL Server internal major version (the leading
// component of EngineVersion strings like "15.00.4345.5.v1") to the marketing
// year users recognise. Only the years currently orderable on RDS are listed;
// an unmapped major is skipped rather than guessed (see majorVersion).
var sqlServerMajorToYear = map[int]string{
	13: "2016",
	14: "2017",
	15: "2019",
	16: "2022",
}

// isSqlServerEngine reports whether an engine identifier is any SQL Server
// flavour (sqlserver-se/ee/ex/web/dev-ee and the custom-sqlserver-* variants).
func isSqlServerEngine(engine string) bool {
	return strings.Contains(engine, "sqlserver")
}

// majorComponentCount is how many leading dot-separated numeric components make
// up an engine's "major version line" for the compact range. PostgreSQL and
// Oracle bump the leading component per major release (their minor component is
// effectively the patch level: postgres 11.22 is patch 22 of major 11), so one
// component is the major. The MySQL/MariaDB/DocumentDB/Neptune/Db2 families
// distinguish releases at major.minor (e.g. MySQL 8.0 vs 8.4), so two.
func majorComponentCount(engine string) int {
	if engine == "postgres" || engine == "aurora-postgresql" || strings.HasPrefix(engine, "oracle") {
		return 1
	}
	return 2
}

// numericLeadingComponents returns the leading run of purely-numeric,
// dot-separated components of a version string. It stops at the first
// non-numeric component, which strips RDS patch/build suffixes such as
// "11.22-rds.20241121" -> ["11"], "5.7.mysql_aurora.2.11.1" -> ["5","7"] and
// "19.0.0.0.ru-2020-04..." -> ["19","0","0","0"].
func numericLeadingComponents(version string) []string {
	parts := strings.Split(version, ".")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if _, err := strconv.Atoi(p); err != nil {
			break
		}
		out = append(out, p)
	}
	return out
}

// majorVersion collapses a raw RDS EngineVersion string to its compact major
// version token for the given engine. The second return value is false when the
// version cannot be mapped (unparseable, or a SQL Server major outside the
// known year mapping); the caller skips such versions rather than fabricating.
func majorVersion(engine, version string) (string, bool) {
	if isSqlServerEngine(engine) {
		comps := numericLeadingComponents(version)
		if len(comps) == 0 {
			return "", false
		}
		major, err := strconv.Atoi(comps[0])
		if err != nil {
			return "", false
		}
		year, ok := sqlServerMajorToYear[major]
		return year, ok
	}

	comps := numericLeadingComponents(version)
	if len(comps) == 0 {
		return "", false
	}
	n := majorComponentCount(engine)
	if n > len(comps) {
		n = len(comps)
	}
	return strings.Join(comps[:n], "."), true
}

// compareVersionTokens orders two compact major tokens numerically per
// dot-separated component (so "9" < "10" and "8.0" < "8.4"). Missing trailing
// components count as 0. Both inputs are produced by majorVersion, so their
// components are always numeric.
func compareVersionTokens(a, b string) int {
	pa := strings.Split(a, ".")
	pb := strings.Split(b, ".")
	n := len(pa)
	if len(pb) > n {
		n = len(pb)
	}
	for i := 0; i < n; i++ {
		var x, y int
		if i < len(pa) {
			x, _ = strconv.Atoi(pa[i])
		}
		if i < len(pb) {
			y, _ = strconv.Atoi(pb[i])
		}
		if x != y {
			if x < y {
				return -1
			}
			return 1
		}
	}
	return 0
}

// addOrderableOption folds one (class, engine, raw version) orderable option
// into the accumulator, widening the per-class per-engine major-version range.
// Versions that cannot be collapsed to a known major are skipped.
func addOrderableOption(acc map[string]map[string]*engineVersionRange, class, engine, version string) {
	major, ok := majorVersion(engine, version)
	if !ok {
		return
	}
	byEngine := acc[class]
	if byEngine == nil {
		byEngine = make(map[string]*engineVersionRange)
		acc[class] = byEngine
	}
	r := byEngine[engine]
	if r == nil {
		byEngine[engine] = &engineVersionRange{Min: major, Max: major}
		return
	}
	if compareVersionTokens(major, r.Min) < 0 {
		r.Min = major
	}
	if compareVersionTokens(major, r.Max) > 0 {
		r.Max = major
	}
}

// getRdsEngineSupport queries the RDS API in a single region and returns, per
// instance class (e.g. "db.m5.large"), the compact supported major-version
// range for every engine it can run. The authoritative source is
// DescribeOrderableDBInstanceOptions (which engine versions are orderable on
// which class); DescribeDBEngineVersions supplies the engine universe to
// iterate. See RDS_ENGINE_SUPPORT_REGION for the v1 single-region scoping.
func getRdsEngineSupport() map[string]map[string]engineVersionRange {
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRetryMaxAttempts(10),
		config.WithRetryMode(aws.RetryModeAdaptive),
	)
	if err != nil {
		log.Fatalln("RDS engine support: failed to load AWS config", err)
	}
	cfg.Region = RDS_ENGINE_SUPPORT_REGION
	client := rds.NewFromConfig(cfg)

	// Enumerate the engines.
	engines := make([]string, 0)
	seen := make(map[string]bool)
	enginePaginator := rds.NewDescribeDBEngineVersionsPaginator(client, &rds.DescribeDBEngineVersionsInput{})
	for enginePaginator.HasMorePages() {
		out, err := enginePaginator.NextPage(context.TODO())
		if err != nil {
			log.Fatalln("RDS engine support: DescribeDBEngineVersions failed", err)
		}
		for _, v := range out.DBEngineVersions {
			if v.Engine == nil || seen[*v.Engine] {
				continue
			}
			seen[*v.Engine] = true
			engines = append(engines, *v.Engine)
		}
	}
	if len(engines) == 0 {
		log.Fatalln("RDS engine support: DescribeDBEngineVersions returned no engines")
	}

	// Accumulate the per-class per-engine major version ranges.
	acc := make(map[string]map[string]*engineVersionRange)
	for _, engine := range engines {
		paginator := rds.NewDescribeOrderableDBInstanceOptionsPaginator(client, &rds.DescribeOrderableDBInstanceOptionsInput{
			Engine: &engine,
		})
		for paginator.HasMorePages() {
			out, err := paginator.NextPage(context.TODO())
			if err != nil {
				log.Fatalln("RDS engine support: DescribeOrderableDBInstanceOptions failed for engine", engine, err)
			}
			for _, o := range out.OrderableDBInstanceOptions {
				if o.DBInstanceClass == nil || o.EngineVersion == nil {
					continue
				}
				addOrderableOption(acc, *o.DBInstanceClass, engine, *o.EngineVersion)
			}
		}
	}

	// Flatten the pointer accumulator into plain values for serialisation.
	result := make(map[string]map[string]engineVersionRange, len(acc))
	for class, byEngine := range acc {
		flattened := make(map[string]engineVersionRange, len(byEngine))
		for engine, r := range byEngine {
			flattened[engine] = *r
		}
		result[class] = flattened
	}

	log.Println("RDS engine support from AWS:", len(result), "instance classes across", len(engines), "engines")
	return result
}
