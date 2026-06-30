package ec2

import (
	"fmt"
	"log"
	"regexp"
	"scraper/utils"
	"strconv"
	"strings"

	"github.com/anaskhan96/soup"
)

// AWS publishes per-family instance-type docs as markdown with embedded HTML
// tables. Each doc contains an "Instance store specifications" table with a
// "100% random read IOPS / Write IOPS" column keyed by instance type. We scrape
// those tables to expose the instance-store random read/write IOPS on each
// instance.
const awsInstanceTypeDocBase = "https://docs.aws.amazon.com/ec2/latest/instancetypes"

// iopsDocSlugs are the instance-type doc families that carry instance-store
// specs (general purpose, compute, memory, storage, accelerated, HPC).
var iopsDocSlugs = []string{"gp", "co", "mo", "so", "ac", "hpc"}

var (
	iopsHeaderRe     = regexp.MustCompile(`(?i)random read IOPS`)
	instanceHeaderRe = regexp.MustCompile(`(?i)instance type`)
	// instanceTypeRe matches a "." followed by a word char, the same heuristic
	// the original Node scraper used to tell instance-type rows (e.g. "m5.large")
	// apart from family-header rows.
	instanceTypeRe = regexp.MustCompile(`\.\w`)
)

type storageIops struct {
	readIops  int
	writeIops int
}

func parseIopsCells(instanceType, iopsCell string) (string, storageIops, bool) {
	instanceType = strings.TrimSpace(instanceType)
	if instanceType == "" || !instanceTypeRe.MatchString(instanceType) {
		return "", storageIops{}, false
	}

	iopsCell = strings.TrimSpace(iopsCell)
	if iopsCell == "" {
		return "", storageIops{}, false
	}
	parts := strings.Split(iopsCell, "/")
	if len(parts) != 2 {
		return "", storageIops{}, false
	}
	readIops, okRead := parseIopsValue(parts[0])
	writeIops, okWrite := parseIopsValue(parts[1])
	if !okRead || !okWrite {
		return "", storageIops{}, false
	}

	return strings.ToLower(instanceType), storageIops{
		readIops:  readIops,
		writeIops: writeIops,
	}, true
}

func parseIopsHTMLTables(markdown string) map[string]storageIops {
	doc := soup.HTMLParse(markdown)
	results := map[string]storageIops{}

	for _, table := range doc.FindAll("table") {
		thead := table.Find("thead")
		if thead.Error != nil {
			continue
		}
		ths := thead.FindAll("th")
		if len(ths) == 0 {
			continue
		}

		iopsColIdx := -1
		instanceColIdx := 0
		for i, th := range ths {
			text := strings.TrimSpace(th.FullText())
			if iopsHeaderRe.MatchString(text) {
				iopsColIdx = i
			}
			if instanceHeaderRe.MatchString(text) {
				instanceColIdx = i
			}
		}
		if iopsColIdx == -1 {
			continue
		}

		tbody := table.Find("tbody")
		if tbody.Error != nil {
			continue
		}
		for _, tr := range tbody.FindAll("tr") {
			tds := tr.FindAll("td")
			if instanceColIdx >= len(tds) || iopsColIdx >= len(tds) {
				continue
			}
			instanceType, iops, ok := parseIopsCells(
				tds[instanceColIdx].FullText(),
				tds[iopsColIdx].FullText(),
			)
			if !ok {
				continue
			}
			results[instanceType] = iops
		}
	}

	return results
}

// splitMarkdownRow splits a markdown table row into trimmed cells, dropping the
// empty leading/trailing edges produced by the surrounding pipes.
func splitMarkdownRow(line string) []string {
	line = strings.TrimSpace(line)
	line = strings.TrimPrefix(line, "|")
	line = strings.TrimSuffix(line, "|")
	parts := strings.Split(line, "|")
	cells := make([]string, len(parts))
	for i, p := range parts {
		cells[i] = strings.TrimSpace(p)
	}
	return cells
}

// parseIopsValue mimics JS parseInt after stripping thousands separators: it
// reads the leading (optionally signed) integer prefix and ignores any trailing
// text. Returns ok=false when there is no leading integer.
func parseIopsValue(s string) (int, bool) {
	s = strings.ReplaceAll(strings.TrimSpace(s), ",", "")
	end := 0
	if end < len(s) && (s[end] == '+' || s[end] == '-') {
		end++
	}
	start := end
	for end < len(s) && s[end] >= '0' && s[end] <= '9' {
		end++
	}
	if end == start {
		return 0, false
	}
	n, err := strconv.Atoi(s[:end])
	if err != nil {
		return 0, false
	}
	return n, true
}

// parseIopsTable parses the instance-store IOPS table out of one AWS
// instance-type markdown doc, returning a lowercase-instance-type -> IOPS map.
// It first handles the current embedded-HTML AWS doc shape, then falls back to
// the older pipe-table shape used by the original parser.
func parseIopsTable(markdown string) map[string]storageIops {
	htmlResults := parseIopsHTMLTables(markdown)
	if len(htmlResults) > 0 {
		return htmlResults
	}

	lines := strings.Split(markdown, "\n")
	inTable := false
	iopsColIdx := -1
	instanceColIdx := -1
	results := map[string]storageIops{}

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if !strings.HasPrefix(trimmed, "|") {
			// A non-table line ends the table once we are inside one.
			if inTable {
				break
			}
			continue
		}

		cells := splitMarkdownRow(trimmed)

		if !inTable {
			for i, c := range cells {
				if iopsHeaderRe.MatchString(c) {
					iopsColIdx = i
					break
				}
			}
			if iopsColIdx == -1 {
				continue
			}
			inTable = true
			instanceColIdx = 0
			for i, c := range cells {
				if instanceHeaderRe.MatchString(c) {
					instanceColIdx = i
					break
				}
			}
			continue
		}

		// Skip the header/body separator row (cells of only dashes).
		if isSeparatorRow(cells) {
			continue
		}

		// Skip family-header rows: a single non-empty cell that is not itself an
		// instance type.
		nonEmpty := make([]string, 0, len(cells))
		for _, c := range cells {
			if c != "" {
				nonEmpty = append(nonEmpty, c)
			}
		}
		if len(nonEmpty) <= 1 {
			first := ""
			if len(nonEmpty) == 1 {
				first = nonEmpty[0]
			}
			if !instanceTypeRe.MatchString(first) {
				continue
			}
		}

		if instanceColIdx >= len(cells) || iopsColIdx >= len(cells) {
			continue
		}
		instanceType, iops, ok := parseIopsCells(
			cells[instanceColIdx],
			cells[iopsColIdx],
		)
		if !ok {
			continue
		}
		results[instanceType] = iops
	}

	return results
}

// isSeparatorRow reports whether every cell consists solely of dashes (the
// markdown header/body separator), e.g. "--- | ---".
func isSeparatorRow(cells []string) bool {
	for _, c := range cells {
		if c == "" {
			return false
		}
		for _, r := range c {
			if r != '-' {
				return false
			}
		}
	}
	return len(cells) > 0
}

// addStorageIopsInfo fetches the AWS instance-type docs, parses the
// instance-store random read/write IOPS tables, and sets the values on each
// matching instance that has instance storage. Instances without a documented
// value are left untouched (no fabricated zeros). Fails loud on fetch errors or
// when nothing parses/matches, so a broken scrape never ships empty data.
func addStorageIopsInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding instance store IOPS to EC2")

	allIops := map[string]storageIops{}
	for _, slug := range iopsDocSlugs {
		url := fmt.Sprintf("%s/%s.md", awsInstanceTypeDocBase, slug)
		body, err := utils.FetchWithRetry(url, nil)
		if err != nil {
			log.Fatalln("Failed to fetch instance store IOPS doc", url, err)
		}
		parsed := parseIopsTable(string(body))
		log.Default().Printf("%s.md: %d instance types with IOPS", slug, len(parsed))
		for k, v := range parsed {
			allIops[k] = v
		}
	}

	if len(allIops) == 0 {
		log.Fatalln("Parsed zero instance store IOPS entries across all docs")
	}

	matched := 0
	for instanceType, instance := range instances {
		iops, ok := allIops[strings.ToLower(instanceType)]
		if !ok {
			continue
		}
		if instance.Storage == nil {
			continue
		}
		readIops := iops.readIops
		writeIops := iops.writeIops
		instance.Storage.StorageReadIops = &readIops
		instance.Storage.StorageWriteIops = &writeIops
		matched++
	}

	if matched == 0 {
		log.Fatalln("Zero instances matched instance store IOPS data; IOPS entries:", len(allIops))
	}

	log.Default().Printf("Merged instance store IOPS into %d instances (of %d IOPS entries)", matched, len(allIops))
}
