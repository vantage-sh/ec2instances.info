package aws

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"scraper/utils"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/anaskhan96/soup"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

var OK_NVME_STRINGS = map[string]bool{
	"supported": true,
	"required":  true,
}

func addInstanceStorageDetails(instance *EC2Instance, apiDescription *types.InstanceTypeInfo) {
	storageInfo := apiDescription.InstanceStorageInfo
	if storageInfo != nil {
		if len(storageInfo.Disks) == 0 {
			log.Default().Println("No disks found for", instance.InstanceType)
		}
		disk := storageInfo.Disks[0]
		instance.Storage = &Storage{
			NVMeSSD: OK_NVME_STRINGS[string(storageInfo.NvmeSupport)],
			SSD:     disk.Type == "ssd",

			// Redundant column - but here for legacy reasons. Any SSD will have trim support
			TrimSupport: disk.Type == "ssd",

			// Always seems to be false in the Python code
			// TODO: add this? Unsure why its not in the Python code
			StorageNeedsInitalization: false,
			IncludesSwapPartition:     false,

			Devices:  int(*disk.Count),
			Size:     int(*disk.SizeInGB),
			SizeUnit: "GB",
		}
	}
}

var IPV4_ONLY_FAMILIES = []string{
	"cg1",
	"m1",
	"m3",
	"c1",
	"cc2",
	"g2",
	"m2",
	"cr1",
	"hs1",
	"t1",
}

func enrichEc2Instance(instance *EC2Instance, attributes map[string]string, ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo]) {
	instance.Family = attributes["instanceFamily"]
	VCPU, err := strconv.Atoi(attributes["vcpu"])
	if err != nil {
		log.Fatal(err)
	}
	instance.VCPU = VCPU
	switch instance.InstanceType {
	case "u-6tb1.metal":
		instance.Memory = 6144
	case "u-9tb1.metal":
		instance.Memory = 9216
	case "u-12tb1.metal":
		instance.Memory = 12288
	default:
		Memory, err := strconv.ParseFloat(strings.Split(attributes["memory"], " ")[0], 64)
		if err != nil {
			log.Fatal(err)
		}
		instance.Memory = Memory
	}

	for _, family := range IPV4_ONLY_FAMILIES {
		if strings.HasPrefix(instance.InstanceType, family) {
			instance.IPV6Support = false
			break
		}
	}

	if instance.PrettyName == "" {
		instance.PrettyName = addPrettyName(instance.InstanceType, EC2_FAMILY_NAMES)
	}

	apiDescription, hasApiDescription := ec2ApiResponses.Get(instance.InstanceType)
	instance.PhysicalProcessor = attributes["physicalProcessor"]
	if hasApiDescription {
		arches := make([]string, len(apiDescription.ProcessorInfo.SupportedArchitectures))
		for i, arch := range apiDescription.ProcessorInfo.SupportedArchitectures {
			arches[i] = string(arch)
		}
		instance.Arch = arches

		if apiDescription.NetworkInfo.NetworkPerformance == nil {
			instance.NetworkPerformance = "Unknown"
		} else if *apiDescription.NetworkInfo.NetworkPerformance != "NA" {
			instance.NetworkPerformance = *apiDescription.NetworkInfo.NetworkPerformance
		}
	} else {
		if instance.Arch == nil {
			// Try and figure out the value with a best guess
			if strings.Contains(instance.PhysicalProcessor, "AWS Graviton") {
				// Presume arm64 for Amazon chips
				instance.Arch = []string{"arm64"}
			} else {
				// Otherwise, presume x86_64
				instance.Arch = []string{"x86_64"}
				processorArchitecture := attributes["processorArchitecture"]
				if strings.Contains(processorArchitecture, "32-bit") {
					instance.Arch = append(instance.Arch, "i386")
				}
			}
		}
		networkPerformance := attributes["networkPerformance"]
		if networkPerformance != "NA" {
			instance.NetworkPerformance = networkPerformance
		}
	}

	if attributes["currentGeneration"] == "Yes" {
		instance.Generation = "current"
	} else {
		instance.Generation = "previous"
	}

	gpu := attributes["gpu"]
	if gpu != "" {
		GPU, err := strconv.Atoi(gpu)
		if err != nil {
			log.Fatal(err)
		}
		instance.GPU = GPU
	}
	if strings.Contains(instance.InstanceType, "inf") || strings.Contains(instance.InstanceType, "trn") {
		instance.GPU = 1
	}

	if hasApiDescription {
		if instance.FPGA == 0 {
			// Check if there's any FPGA's
			if apiDescription.FpgaInfo != nil {
				for _, fpga := range apiDescription.FpgaInfo.Fpgas {
					if fpga.Count != nil {
						instance.FPGA = int(*fpga.Count)
					}
				}
			}
		}

		if apiDescription.NetworkInfo != nil {
			if apiDescription.NetworkInfo.EnaSupport == "required" {
				instance.EBSAsNVMe = true
			}

			instance.VPC = &VPC{
				MaxENIs:   int(*apiDescription.NetworkInfo.MaximumNetworkInterfaces),
				IPsPerENI: int(*apiDescription.NetworkInfo.Ipv4AddressesPerInterface),
			}
		}

		if apiDescription.EbsInfo != nil {
			if apiDescription.EbsInfo.EbsOptimizedInfo != nil {
				ebsOptimizedInfo := apiDescription.EbsInfo.EbsOptimizedInfo
				instance.EBSOptimized = true
				instance.EBSBaselineThroughput = *ebsOptimizedInfo.BaselineThroughputInMBps
				instance.EBSBaselineIOPS = int(*ebsOptimizedInfo.BaselineIops)
				instance.EBSBaselineBandwidth = int(*ebsOptimizedInfo.BaselineBandwidthInMbps)
				instance.EBSThroughput = *ebsOptimizedInfo.MaximumThroughputInMBps
				instance.EBSIOPS = int(*ebsOptimizedInfo.MaximumIops)
				instance.EBSMaxBandwidth = int(*ebsOptimizedInfo.MaximumBandwidthInMbps)
			}
		}
	}

	ecu := attributes["ecu"]
	if ecu != "Variable" {
		ECU, err := strconv.ParseFloat(ecu, 64)
		if err == nil && ECU != 0 {
			instance.ECU = ECU
		}
	}

	processorFeatures := attributes["processorFeatures"]
	trueVal := true
	if strings.Contains(processorFeatures, "Intel AVX512") {
		instance.IntelAVX512 = &trueVal
	}
	if strings.Contains(processorFeatures, "Intel AVX2") {
		instance.IntelAVX2 = &trueVal
	}
	if strings.Contains(processorFeatures, "Intel AVX") {
		instance.IntelAVX = &trueVal
	}
	if strings.Contains(processorFeatures, "Intel Turbo") {
		instance.IntelTurbo = &trueVal
	}

	clockSpeed := attributes["clockSpeed"]
	if clockSpeed != "" {
		instance.ClockSpeedGhz = &clockSpeed
	}

	if instance.Generation == "current" && instance.InstanceType[:2] != "t2" {
		instance.EnhancedNetworking = &trueVal
	}

	if hasApiDescription {
		addInstanceStorageDetails(instance, apiDescription)
	}
}

var EC2_OK_PRODUCT_FAMILIES = map[string]bool{
	"Compute Instance":              true,
	"Compute Instance (bare metal)": true,
	"Dedicated Host":                true,
}

var EC2_ADD_METAL = map[string]bool{
	"u-6tb1":  true,
	"u-9tb1":  true,
	"u-12tb1": true,
}

var EC2_FAMILY_NAMES = map[string]string{
	"c1":      "C1 High-CPU",
	"c3":      "C3 High-CPU",
	"c4":      "C4 High-CPU",
	"c5":      "C5 High-CPU",
	"c5d":     "C5 High-CPU",
	"cc2":     "Cluster Compute",
	"cg1":     "Cluster GPU",
	"cr1":     "High Memory Cluster",
	"hi1":     "HI1. High I/O",
	"hs1":     "High Storage",
	"i3":      "I3 High I/O",
	"m1":      "M1 General Purpose",
	"m2":      "M2 High Memory",
	"m3":      "M3 General Purpose",
	"m4":      "M4 General Purpose",
	"m5":      "M5 General Purpose",
	"m5d":     "M5 General Purpose",
	"g3":      "G3 Graphics GPU",
	"g4":      "G4 Graphics and Machine Learning GPU",
	"g5":      "G5 Graphics and Machine Learning GPU",
	"g6":      "G6 Graphics and Machine Learning GPU",
	"g6e":     "G6e Graphics and Machine Learning GPU",
	"gr6":     "Gr6 Graphics and Machine Learning GPU High RAM ratio",
	"p2":      "P2 General Purpose GPU",
	"p3":      "P3 High Performance GPU",
	"p4d":     "P4D Highest Performance GPU",
	"p5e":     "P5e High Performance Computing GPU",
	"p5en":    "P5en High Performance Computing GPU",
	"p6-b200": "P6-B200 High Performance and Machine Learning GPU",
	"r3":      "R3 High-Memory",
	"r4":      "R4 High-Memory",
	"x1":      "X1 Extra High-Memory",
}

func int32Ptr(i int32) *int32 {
	return &i
}

func makeEc2Iterator() *utils.SlowBuildingMap[string, *types.InstanceTypeInfo] {
	return utils.NewSlowBuildingMap(func(pushChunk func(map[string]*types.InstanceTypeInfo)) {
		paginator := ec2.NewDescribeInstanceTypesPaginator(ec2Client, &ec2.DescribeInstanceTypesInput{
			MaxResults: int32Ptr(100),
		})
		for paginator.HasMorePages() {
			output, err := paginator.NextPage(context.Background())
			if err != nil {
				log.Fatal(err)
			}
			log.Default().Println("Processed", len(output.InstanceTypes), "instance types via EC2 describe API")

			mapped := make(map[string]*types.InstanceTypeInfo)
			for i := range output.InstanceTypes {
				mapped[string(output.InstanceTypes[i].InstanceType)] = &output.InstanceTypes[i]
			}
			pushChunk(mapped)
		}
	})
}

var OS_MAP = map[string]string{
	"Linux":                            "linux",
	"RHEL":                             "rhel",
	"Red Hat Enterprise Linux with HA": "rhel",
	"SUSE":                             "sles",
	"Windows":                          "mswin",
	"Ubuntu Pro":                       "ubuntu",
	"Ubuntu Pro Linux":                 "ubuntu",
	// Spot products
	"Linux/UNIX":                            "linux",
	"Red Hat Enterprise Linux":              "rhel",
	"Red Hat Enterprise Linux (Amazon VPC)": "rhel",
	"SUSE Linux":                            "sles",
	"NA":                                    "",
}

var SOFTWARE_MAP = map[string]string{
	"NA":      "",
	"SQL Std": "SQL",
	"SQL Web": "SQLWeb",
	"SQL Ent": "SQLEnterprise",
}

func translatePlatformName(operatingSystem string, preinstalledSoftware string) string {
	osValue, ok := OS_MAP[operatingSystem]
	if !ok {
		osValue = "unknown"
	}
	softwareValue, ok := SOFTWARE_MAP[preinstalledSoftware]
	if !ok {
		softwareValue = "unknown"
	}

	if osValue == "" && softwareValue == "" {
		return ""
	}

	val := osValue + softwareValue
	if strings.Contains(val, "unknown") {
		log.Default().Println("WARNING: Unknown platform", operatingSystem, preinstalledSoftware)
		return ""
	}
	return val
}

func formatPrice(price float64) string {
	dp := fmt.Sprintf("%.6f", price)
	dp = strings.TrimRight(dp, "0")
	dp = strings.TrimRight(dp, ".")
	return dp
}

var LEASES = map[string]string{
	"1yr": "yrTerm1",
	"3yr": "yrTerm3",
}

var PURCHASE_OPTIONS = map[string]string{
	"All Upfront":        "allUpfront",
	"AllUpfront":         "allUpfront",
	"Partial Upfront":    "partialUpfront",
	"PartialUpfront":     "partialUpfront",
	"No Upfront":         "noUpfront",
	"NoUpfront":          "noUpfront",
	"Light Utilization":  "lightUtilization",
	"Medium Utilization": "mediumUtilization",
	"Heavy Utilization":  "heavyUtilization",
}

func translateReservedTermAttributes(termAttributes map[string]string) string {
	leaseContractLength := termAttributes["LeaseContractLength"]
	purchaseOption := termAttributes["PurchaseOption"]
	offeringClass := termAttributes["OfferingClass"]

	lease := LEASES[leaseContractLength]
	option := PURCHASE_OPTIONS[purchaseOption]

	if lease == "" || option == "" || offeringClass == "" {
		log.Fatalln("EC2 Reserved pricing data makes unknown term code", termAttributes)
	}

	return lease + capitalize(offeringClass) + "." + option
}

var START_NUMBERS = regexp.MustCompile(`^(\d+)`)

func processReservedOffer(
	pricingData *EC2PricingData,
	priceDimensions map[string]RegionPriceDimension,
	termAttributes map[string]string,
) {
	// Go through the price dimensions to get the upfront and hourly prices
	upfrontPrice := 0.0
	pricePerHour := 0.0
	for _, priceDimension := range priceDimensions {
		tempPrice := 0.0
		if priceDimension.PricePerUnit != nil {
			usd, ok := priceDimension.PricePerUnit["USD"]
			if ok {
				usdFloat, err := strconv.ParseFloat(usd, 64)
				if err != nil {
					log.Fatalln(
						"Unable to parse EC2 pricing data for",
						priceDimension.PricePerUnit,
					)
				}
				tempPrice = usdFloat
			}
		}

		if priceDimension.Unit == "Hrs" {
			pricePerHour = tempPrice
		} else {
			upfrontPrice = tempPrice
		}
	}

	// Translate the term attributes into a term code
	localTerm := translateReservedTermAttributes(termAttributes)

	// Get the price per hour
	startNumber := START_NUMBERS.FindString(termAttributes["LeaseContractLength"])
	if startNumber == "" {
		log.Fatalln("EC2 Reserved pricing data has no start number", localTerm)
	}
	leaseInYears, err := strconv.Atoi(startNumber)
	if err != nil {
		log.Fatalln("EC2 Reserved pricing data has no start number", localTerm)
	}
	hoursInTerm := leaseInYears * 365 * 24
	finalPrice := pricePerHour + (upfrontPrice / float64(hoursInTerm))

	// Write to the pricing data
	(*pricingData.Reserved)[localTerm] = formatPrice(finalPrice)
}

type ec2SkuData struct {
	instance *EC2Instance
	platform string
}

func addSpotPricing(instances map[string]*EC2Instance, regions map[string]string) {
	log.Default().Println("Adding spot pricing to EC2")

	var success uintptr
	var regionFg utils.FunctionGroup
	instancesMu := sync.Mutex{}
	for region := range regions {
		regionFg.Add(func() {
			// Create a new configuration
			awsConfig, err := config.LoadDefaultConfig(context.Background())
			if err != nil {
				log.Fatal(err)
			}
			awsConfig.Region = region
			ec2Client := ec2.NewFromConfig(awsConfig)

			// Setup the iterator
			instanceTypes := make([]types.InstanceType, 0, len(instances))
			for instanceType := range instances {
				instanceTypes = append(instanceTypes, types.InstanceType(instanceType))
			}
			now := time.Now()
			paginator := ec2.NewDescribeSpotPriceHistoryPaginator(ec2Client, &ec2.DescribeSpotPriceHistoryInput{
				InstanceTypes: instanceTypes,
				StartTime:     &now,
				MaxResults:    int32Ptr(100),
			})

			// Process the spot price history
			firstPage := true
			for paginator.HasMorePages() {
				output, err := paginator.NextPage(context.TODO())
				if err != nil {
					if firstPage {
						// NEVER allow a ratelimit error.
						if strings.Contains(err.Error(), "RateLimitExceeded") {
							log.Fatal("EC2 region has a rate limit error", region)
						}

						// Use us-east-1 as the canary to make sure this works
						// Otherwise, this is probably fine
						if region == "us-east-1" {
							log.Fatal("failed to get spot pricing for us-east-1 ", err)
						}
						break
					} else {
						log.Fatal(err)
					}
				}
				firstPage = false
				atomic.AddUintptr(&success, 1)

				for _, price := range output.SpotPriceHistory {
					// Get the instance and platform this is relating to
					instancesMu.Lock()
					instance := instances[string(price.InstanceType)]
					if instance == nil {
						log.Fatalln("EC2 Spot pricing data has unknown instance type", price.InstanceType)
					}
					platform := translatePlatformName(
						string(price.ProductDescription),
						"NA",
					)
					az := *price.AvailabilityZone
					region := az[:len(az)-1]

					// Get the platform pricing data
					pricingData := instance.Pricing[region]
					created := false
					if pricingData == nil {
						created = true
						pricingData = make(map[OS]any)
						instance.Pricing[region] = pricingData
					}
					instancesMu.Unlock()
					osMap, _ := pricingData[platform].(*EC2PricingData)
					if osMap == nil {
						created = true
						osMap = &EC2PricingData{}
					}

					if created {
						// Newly created pricing data - add ourself as the only item
						spotPrice := Price(floaty(*price.SpotPrice))
						osMap.spot = []Price{spotPrice}
						osMap.SpotMin = &spotPrice
						osMap.SpotMax = &spotPrice
					} else {
						// Append and sort everything
						if osMap.spot == nil {
							osMap.spot = make([]Price, 0)
						}
						osMap.spot = append(osMap.spot, Price(floaty(*price.SpotPrice)))
						slices.Sort(osMap.spot)
						osMap.SpotMin = &osMap.spot[0]
						osMap.SpotMax = &osMap.spot[len(osMap.spot)-1]
					}
					var avg Price = 0.0
					for _, spot := range osMap.spot {
						avg += spot
					}
					avg /= Price(len(osMap.spot))
					osMap.SpotAvg = Price(avg)
				}
			}
		})
	}
	regionFg.Run()

	if success == 0 {
		log.Fatalln("EC2 Spot pricing data failed to get any data")
	}
}

type EBSConfig struct {
	Regions []EBSRegion `json:"regions"`
}

type EBSValueColumn struct {
	Prices map[string]string `json:"prices"`
}

type EBSStorageSize struct {
	Size         string           `json:"size"`
	ValueColumns []EBSValueColumn `json:"valueColumns"`
}

type EBSInstanceType struct {
	Sizes []EBSStorageSize `json:"sizes"`
}

type EBSRegion struct {
	Region        string            `json:"region"`
	InstanceTypes []EBSInstanceType `json:"instanceTypes"`
}

type EBSData struct {
	Config EBSConfig `json:"config"`
}

var EBS_REGION_MAP = map[string]string{
	"eu-ireland":   "eu-west-1",
	"eu-frankfurt": "eu-central-1",
	"apac-sin":     "ap-southeast-1",
	"apac-syd":     "ap-southeast-2",
	"apac-tokyo":   "ap-northeast-1",
}

func transformEbsRegionName(region string) string {
	if region, ok := EBS_REGION_MAP[region]; ok {
		return region
	}

	// Parse region name to extract base and number
	// Pattern: ^([^0-9]*)(-(\d))?$
	// This matches a region name that optionally ends with a dash and number
	for i := len(region) - 1; i >= 0; i-- {
		if region[i] == '-' {
			// Check if what follows is a number
			if i+1 < len(region) {
				numStr := region[i+1:]
				if _, err := strconv.Atoi(numStr); err == nil {
					// Valid format: base-number
					return region
				}
			}
			// Invalid format, treat as base-1
			return region + "-1"
		}
		if region[i] >= '0' && region[i] <= '9' {
			continue
		}
		// Found non-digit character, everything before this is the base
		// If no dash found, append -1
		return region + "-1"
	}

	log.Fatalln("Can't parse region", region)
	return ""
}

func addEBSPricing(instances map[string]*EC2Instance) {
	log.Default().Println("Adding EBS pricing to EC2")

	var ebsData EBSData
	err := fetchDataFromAWSWebsite(
		"https://a0.awsstatic.com/pricing/1/ec2/pricing-ebs-optimized-instances.min.js",
		&ebsData,
	)
	if err != nil {
		log.Fatalln("Failed to fetch EBS pricing data", err)
	}

	for _, regionSpec := range ebsData.Config.Regions {
		region := transformEbsRegionName(regionSpec.Region)
		for _, instanceTypeSpec := range regionSpec.InstanceTypes {
			for _, sizeSpec := range instanceTypeSpec.Sizes {
				instance := instances[sizeSpec.Size]
				if instance == nil {
					log.Fatalln("EBS pricing data has unknown instance type", sizeSpec.Size)
				}
				pricingData := instance.Pricing[region]
				if pricingData == nil {
					pricingData = make(map[OS]any)
				}
				for _, col := range sizeSpec.ValueColumns {
					price, ok := col.Prices["USD"]
					if !ok {
						log.Fatalln("EBS pricing data has no price for", sizeSpec.Size, col.Prices)
					}
					priceFloat, err := strconv.ParseFloat(price, 64)
					if err != nil {
						log.Fatalln("EBS pricing data has invalid price for", sizeSpec.Size, col.Prices)
					}
					pricingData["ebs"] = formatPrice(priceFloat)
				}
			}
		}
	}
}

var POTENTIALLY_MISSING_LINUX_VIRTUALIZATION_TYPES = map[string][]string{
	"cc2": {"HVM"},
	"cg1": {"HVM"},
	"hi1": {"HVM", "PV"},
	"hs1": {"HVM", "PV"},
	"t1":  {"PV"},
	"m1":  {"PV"},
	"m2":  {"PV"},
	"c1":  {"PV"},
}

func addLinuxAmiInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding Linux AMI info to EC2")

	// https://aws.amazon.com/amazon-linux-ami/instance-type-matrix/ is dead
	// So this is removed for now

	for instanceType, instance := range instances {
		instanceSplit := strings.Split(instanceType, ".")
		if s, ok := POTENTIALLY_MISSING_LINUX_VIRTUALIZATION_TYPES[instanceSplit[0]]; ok {
			for _, virtualizationType := range s {
				if !slices.Contains(instance.LinuxVirtualizationTypes, virtualizationType) {
					instance.LinuxVirtualizationTypes = append(instance.LinuxVirtualizationTypes, virtualizationType)
				}
			}
		}
	}
}

// A few legacy instances can be launched in EC2 Classic, the rest is VPC only
// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-classic-platform.html#ec2-classic-instance-types
var LEGACY_INSTANCE_TYPES = []string{
	"m1",
	"m3",
	"t1",
	"c1",
	"c3",
	"cc2",
	"cr1",
	"m2",
	"r3",
	"d2",
	"hs1",
	"i2",
	"g2",
}

func addVpcOnlyInstances(instances map[string]*EC2Instance) {
	for instanceType, instance := range instances {
		for _, family := range LEGACY_INSTANCE_TYPES {
			if strings.HasPrefix(instanceType, family) {
				instance.VpcOnly = false
				break
			}
		}
	}
}

var RE_REPLACE = regexp.MustCompile(`\*\d$`)

func toText(node soup.Root) string {
	text := strings.TrimSpace(node.FullText())
	text = RE_REPLACE.ReplaceAllString(text, "")
	return strings.TrimSpace(text)
}

func float64Ptr(f float64) *float64 {
	return &f
}

func processT2Row(instance *EC2Instance, childText string) {
	credsPerHourFloat, err := strconv.ParseFloat(childText, 64)
	if err != nil {
		log.Fatalln("Failed to parse T2 credits per hour", childText)
	}
	instance.BasePerformance = float64Ptr(credsPerHourFloat / 60)
	instance.BurstMinutes = float64Ptr(credsPerHourFloat * 24 / float64(instance.VCPU))
}

func addT2Credits(instances map[string]*EC2Instance) {
	log.Default().Println("Adding T2 credits to EC2")

	t2Url := "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html"
	doc, err := utils.LoadHTML(t2Url)
	if err != nil {
		log.Fatalln("Failed to load T2 credits HTML", err)
	}

	tableContainers := doc.FindAll("div", "class", "table-contents")
	if len(tableContainers) < 2 {
		log.Fatalln("Failed to find T2 credits table containers in", t2Url)
	}
	if tableContainers[1].Error != nil {
		log.Fatalln("Failed to load T2 credits table container in", t2Url)
	}
	tables := tableContainers[1].Find("table")
	if tables.Error != nil {
		log.Fatalln("Failed to find T2 credits table in", t2Url)
	}

	tbody := tables.Find("tbody")
	if tbody.Error != nil {
		log.Fatalln("Failed to find T2 credits tbody in", t2Url)
	}

	rows := tbody.FindAll("tr")
	if len(rows) == 0 {
		log.Fatalln("Failed to find T2 credits rows in", t2Url)
	}

	for _, row := range rows {
		children := row.FindAll("td")
		var firstNodeText string

		childrenHtml := make([]string, len(children))
		for i, child := range children {
			childrenHtml[i] = child.HTML()
		}

		if len(children) > 1 {
			firstNodeText = toText(children[0])
			instance := instances[firstNodeText]
			if instance == nil {
				if strings.Contains(firstNodeText, ".") {
					log.Default().Println("WARNING: T2 credits data has unknown instance type", firstNodeText)
				}
			} else {
				childText := toText(children[1])
				if childText == "" {
					log.Default().Println("WARNING: T2 credits data has empty row", firstNodeText)
				} else {
					processT2Row(instance, childText)
				}
			}
		}
	}
}

type emrPrice struct {
	Price string `json:"price"`
}

type emrData struct {
	Regions map[string]map[string]emrPrice `json:"regions"`
}

const EMR_INSTANCE_TYPE_PREFIX = "Instance-instancetype-"

func addEmrPricing(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	log.Default().Println("Adding EMR pricing to EC2")

	var emrData emrData
	err := fetchDataFromAWSWebsite(
		"https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/elasticmapreduce/USD/current/elasticmapreduce.json",
		&emrData,
	)
	if err != nil {
		log.Fatalln("Failed to fetch EMR pricing data", err)
	}

	for regionName, instanceTypes := range emrData.Regions {
		var regions []string
		if regionName == "AWS GovCloud (US)" {
			// Special case for GovCloud
			regions = []string{"us-gov-west-1", "us-gov-east-1"}
		} else {
			// Generally just one region
			region := regionsInverted[regionName]
			if region == "" {
				// This includes weird stuff sometimes. Probably fine.
				continue
			}
			regions = []string{region}
		}

		for priceId, price := range instanceTypes {
			if strings.HasPrefix(priceId, EMR_INSTANCE_TYPE_PREFIX) {
				instanceType := priceId[len(EMR_INSTANCE_TYPE_PREFIX):]
				instance := instances[instanceType]
				if instance == nil {
					log.Default().Println("WARNING: EMR pricing data has unknown instance type", instanceType)
					continue
				}
				for _, region := range regions {
					pricingData := instance.Pricing[region]
					if pricingData == nil {
						pricingData = make(map[OS]any)
						instance.Pricing[region] = pricingData
					}
					pricingData["emr"] = &EC2PricingData{
						EMR: price.Price,
					}
					instance.EMR = true
				}
			}
		}
	}
}

func addGpuInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding GPU info to EC2")

	for instanceType, instance := range instances {
		gpuData, ok := GPU_DATA[instanceType]
		if !ok {
			if instance.GPU > 0 {
				log.Default().Println("WARNING: GPU data missing for", instanceType)
			}
			continue
		}

		instance.GPU = gpuData.gpuCount
		instance.GPUModel = &gpuData.gpuModel
		instance.ComputeCapability = gpuData.computeCapability
		instance.GPUMemory = gpuData.gpuMemory
	}
}

var PLACEMENT_GROUP_EXCEPTIONS = map[string]bool{
	"t2": true,
	"t3": true,
	"t4": true,
	"ma": true,
}

var PLACEMENT_GROUP_PREVIOUS_GENERATION_INSTANCES = []string{
	"cc2.8xlarge",
	"cr1.8xlarge",
	"hs1.8xlarge",
}

var PLACEMENT_GROUP_PREVIOUS_GENERATION_FAMILIES = []string{
	"a1",
	"c3",
	"g2",
	"i2",
	"r3",
}

func addPlacementGroupInfo(instances map[string]*EC2Instance) {
	for instanceType, instance := range instances {
		family := instanceType[0:2]
		if _, ok := PLACEMENT_GROUP_EXCEPTIONS[family]; ok {
			instance.PlacementGroupSupport = false
		} else if instance.Generation == "previous" &&
			!slices.Contains(PLACEMENT_GROUP_PREVIOUS_GENERATION_INSTANCES, instanceType) &&
			!slices.Contains(PLACEMENT_GROUP_PREVIOUS_GENERATION_FAMILIES, family) {
			instance.PlacementGroupSupport = false
		}
	}
}

type dedicatedHostOnDemandPrice struct {
	InstanceType string `json:"Instance Type"`
	Price        string `json:"price"`
}

type dedicatedHostOnDemandData struct {
	Regions map[string]map[string]dedicatedHostOnDemandPrice `json:"regions"`
}

func addDedicatedHostOnDemandPrice(instance *EC2Instance, region string, price string) {
	pricingData := instance.Pricing[region]
	if pricingData == nil {
		pricingData = make(map[OS]any)
		instance.Pricing[region] = pricingData
	}
	dedicated, ok := pricingData["dedicated"].(*EC2PricingData)
	price = formatPrice(floaty(price))
	if ok {
		dedicated.OnDemand = price
	} else {
		m := make(map[string]string)
		dedicated = &EC2PricingData{
			Reserved: &m,
			OnDemand: price,
		}
		pricingData["dedicated"] = dedicated
	}
}

type dedicatedHostReservedPrice struct {
	InstanceType        string `json:"Instance Type"`
	Price               string `json:"price"`
	UpfrontPricePerUnit string `json:"riupfront:PricePerUnit"`
	LeaseContractLength string `json:"LeaseContractLength"`
	PurchaseOption      string `json:"PurchaseOption"`
}

type dedicatedHostReservedData struct {
	Regions map[string]map[string]dedicatedHostReservedPrice `json:"regions"`
}

const DEDICATED_HOST_RESERVED_URL_BASE = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/dedicatedhost-reservedinstance-virtual/"

var RESERVED_TRANSLATIONS = map[string]string{
	"1yrNoUpfront":       "yrTerm1Standard.noUpfront",
	"1yrPartialUpfront":  "yrTerm1Standard.partialUpfront",
	"1yrAllUpfront":      "yrTerm1Standard.allUpfront",
	"1 yrNoUpfront":      "yrTerm1Standard.noUpfront",
	"1 yrPartialUpfront": "yrTerm1Standard.partialUpfront",
	"1 yrAllUpfront":     "yrTerm1Standard.allUpfront",
	"3yrNoUpfront":       "yrTerm3Standard.noUpfront",
	"3yrPartialUpfront":  "yrTerm3Standard.partialUpfront",
	"3yrAllUpfront":      "yrTerm3Standard.allUpfront",
	"3 yrNoUpfront":      "yrTerm3Standard.noUpfront",
	"3 yrPartialUpfront": "yrTerm3Standard.partialUpfront",
	"3 yrAllUpfront":     "yrTerm3Standard.allUpfront",
}

func loadDedicatedHostReservedData(
	region string,
	regionsInverted map[string]string,
	term string,
	paymentOption string,
	instances map[string]*EC2Instance,
	instancesMu *sync.Mutex,
) {
	regionEncoded := url.PathEscape(region)
	termEncoded := url.PathEscape(term)
	paymentOptionEncoded := url.PathEscape(paymentOption)
	url := fmt.Sprintf(
		"%s%s/%s/%s/index.json",
		DEDICATED_HOST_RESERVED_URL_BASE, regionEncoded, termEncoded, paymentOptionEncoded,
	)

	var dedicatedHostReservedData dedicatedHostReservedData
	err := fetchDataFromAWSWebsite(url, &dedicatedHostReservedData)
	if err != nil {
		return
	}

	for regionName, instanceData := range dedicatedHostReservedData.Regions {
		for _, reservedPrice := range instanceData {
			riTranslated, ok := RESERVED_TRANSLATIONS[reservedPrice.LeaseContractLength+reservedPrice.PurchaseOption]
			if !ok {
				log.Default().Println("WARNING: Dedicated host reserved data has unknown term", reservedPrice.LeaseContractLength, reservedPrice.PurchaseOption, "for", reservedPrice.InstanceType)
				continue
			}

			regionSlug := regionsInverted[regionName]
			if regionSlug == "" {
				log.Default().Println("WARNING: Dedicated host reserved data has unknown region", regionName)
				continue
			}

			var upfrontPrice float64
			leaseInYearsStr := START_NUMBERS.FindString(reservedPrice.LeaseContractLength)
			if leaseInYearsStr != "" {
				leaseInYears, err := strconv.Atoi(leaseInYearsStr)
				if err != nil {
					log.Fatalln("Failed to parse lease contract length", reservedPrice.LeaseContractLength)
				}
				hoursInTerm := leaseInYears * 365 * 24
				if reservedPrice.UpfrontPricePerUnit != "" {
					upfrontPrice = floaty(reservedPrice.UpfrontPricePerUnit) / float64(hoursInTerm)
				}
			}
			price := floaty(reservedPrice.Price) + upfrontPrice

			instancesMu.Lock()
			for instanceType, instance := range instances {
				if strings.HasPrefix(instanceType, reservedPrice.InstanceType) {
					pricingData := instance.Pricing[regionSlug]
					if pricingData == nil {
						pricingData = make(map[OS]any)
						instance.Pricing[regionSlug] = pricingData
					}
					dedicated, ok := pricingData["dedicated"].(*EC2PricingData)
					if ok {
						(*dedicated.Reserved)[riTranslated] = formatPrice(price)
					} else {
						m := map[string]string{
							riTranslated: formatPrice(price),
						}
						dedicated = &EC2PricingData{
							Reserved: &m,
							OnDemand: "0",
						}
						pricingData["dedicated"] = dedicated
					}
				}
			}
			instancesMu.Unlock()
		}
	}
}

const DEDICATED_HOST_ON_DEMAND_URL = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/dedicatedhost-ondemand.json"

var (
	DEDICATED_TERMS           = []string{"3 year", "1 year"}
	DEDICATED_PAYMENT_OPTIONS = []string{"No Upfront", "Partial Upfront", "All Upfront"}
)

func addDedicatedHostPricing(instances map[string]*EC2Instance, regionsInverted map[string]string) {
	log.Default().Println("Adding dedicated host pricing to EC2")

	// Get the on demand pricing data
	var dedicatedHostOnDemandData dedicatedHostOnDemandData
	err := fetchDataFromAWSWebsite(DEDICATED_HOST_ON_DEMAND_URL, &dedicatedHostOnDemandData)
	if err != nil {
		log.Fatalln("Failed to fetch dedicated host on demand data", err)
	}

	// Process the on demand pricing data
	for regionName, instanceData := range dedicatedHostOnDemandData.Regions {
		region := regionsInverted[regionName]
		if region == "" {
			continue
		}

		for _, price := range instanceData {
			for instanceType, instance := range instances {
				if strings.HasPrefix(instanceType, price.InstanceType) {
					addDedicatedHostOnDemandPrice(instance, region, price.Price)
				}
			}
		}
	}

	// Get the reserved pricing data
	var fg utils.FunctionGroup
	instancesMu := &sync.Mutex{}
	for region := range dedicatedHostOnDemandData.Regions {
		for _, term := range DEDICATED_TERMS {
			for _, paymentOption := range DEDICATED_PAYMENT_OPTIONS {
				fg.Add(func() {
					loadDedicatedHostReservedData(
						region, regionsInverted, term, paymentOption, instances,
						instancesMu,
					)
				})
			}
		}
	}
	fg.Run()
}

var OS_REMAP = map[string]string{
	"Windows": "mswin",
	"Linux":   "linux",
}

var R_VALUES_MAPPING = []string{
	"<5%", "5-10%", "10-15%", "15-20%", ">20%",
}

func floaty(s string) float64 {
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		log.Fatalln("Failed to parse float", s)
	}
	return f
}

func processSpotInterruptData(region string, os string, instance *EC2Instance, s int, r int) {
	remap, ok := OS_REMAP[os]
	if !ok {
		log.Default().Println("WARNING: Spot interrupt data has unknown OS", os)
		return
	}

	if r > len(R_VALUES_MAPPING) {
		log.Default().Println("WARNING: Spot interrupt data has unknown R value", r, "for", instance.InstanceType)
		return
	}
	rValue := R_VALUES_MAPPING[r]

	regionMap := instance.Pricing[region]
	if regionMap == nil {
		log.Default().Println("WARNING: Spot interrupt data has unknown region", region, "for", instance.InstanceType)
		return
	}

	osResult, ok := regionMap[remap].(*EC2PricingData)
	if !ok {
		log.Default().Println("WARNING: Spot interrupt data has unknown OS", os, "for", instance.InstanceType)
		return
	}

	osResult.PCTInterrupt = rValue
	osResult.PCTSavingsOD = &s
	onDemand := osResult.OnDemand
	if onDemand == "" {
		onDemand = "0"
	}
	estSpot := 0.01 * float64(100-s) * floaty(onDemand)
	if osResult.SpotAvg == 0 {
		osResult.SpotAvg = Price(estSpot)
	}
}

type spotAdvisorData struct {
	S int `json:"s"`
	R int `json:"r"`
}

type spotDataPartial struct {
	SpotAdvisor map[string]map[string]map[string]spotAdvisorData `json:"spot_advisor"`
}

func addSpotInterruptInfo(instances map[string]*EC2Instance) {
	log.Default().Println("Adding spot interrupt info to EC2")

	var spotData spotDataPartial
	err := fetchDataFromAWSWebsite(
		"https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json",
		&spotData,
	)
	if err != nil {
		log.Fatalln("Failed to fetch spot data", err)
	}

	for region, operatingSystems := range spotData.SpotAdvisor {
		for os, spotAdvisorData := range operatingSystems {
			for instanceType, data := range spotAdvisorData {
				instance, ok := instances[instanceType]
				if !ok {
					log.Default().Println("WARNING: Spot interrupt data has unknown instance type", instanceType)
					continue
				}

				processSpotInterruptData(region, os, instance, data.S, data.R)
			}
		}
	}
}

func processEC2Data(inData chan *rawRegion, ec2ApiResponses *utils.SlowBuildingMap[string, *types.InstanceTypeInfo]) {
	// Data that is used throughout the process
	instancesHashmap := make(map[string]*EC2Instance)
	sku2SkuData := make(map[string]ec2SkuData)

	// The descriptions found for each region
	regionDescriptions := make(map[string]string)

	// Process each region as it comes in
	for rawRegion := range inData {
		// Close the channel when we're done
		if rawRegion == nil {
			close(inData)
			break
		}

		// Process the products in the region
		regionDescription := ""
		for _, product := range rawRegion.regionData.Products {
			if _, ok := EC2_OK_PRODUCT_FAMILIES[product.ProductFamily]; !ok {
				continue
			}

			instanceType := product.Attributes["instanceType"]
			if instanceType == "" {
				continue
			}

			location := product.Attributes["location"]
			if location != "" {
				if regionDescription != "" && regionDescription != location {
					log.Fatalln("EC2 Region description mismatch", regionDescription, location, "for", instanceType)
				}
				regionDescription = location
			}

			if _, ok := EC2_ADD_METAL[instanceType]; ok {
				instanceType = instanceType + ".metal"
			}

			pieces := strings.Split(instanceType, ".")
			if len(pieces) == 1 {
				// Dedicated host that is not u-*.metal, skipping
				// May be a good idea to all dedicated hosts in the future
				continue
			}

			instance := instancesHashmap[instanceType]
			if instance == nil {
				instance = &EC2Instance{
					InstanceType:             instanceType,
					Pricing:                  make(map[Region]map[OS]any),
					LinuxVirtualizationTypes: []string{},
					VpcOnly:                  true,
					PlacementGroupSupport:    true,
					IPV6Support:              true,

					// TODO: Figure out why this is always empty in Python code, and
					// make a fixed version for here
					AvailabilityZones: make(map[string][]string),
				}
				instancesHashmap[instanceType] = instance
			}
			platform := translatePlatformName(
				product.Attributes["operatingSystem"],
				product.Attributes["preInstalledSw"],
			)
			if platform != "" {
				sku2SkuData[product.SKU] = ec2SkuData{
					instance: instance,
					platform: platform,
				}
			}
			enrichEc2Instance(instance, product.Attributes, ec2ApiResponses)
		}

		// Gets the pricing data for the region/platform. Creates if it doesn't exist.
		getPricingData := func(instance *EC2Instance, platform string) *EC2PricingData {
			regionMap := instance.Pricing[rawRegion.regionName]
			if regionMap == nil {
				regionMap = make(map[OS]any)
				instance.Pricing[rawRegion.regionName] = regionMap
			}
			osMap := regionMap[platform]
			if osMap == nil {
				m := make(map[string]string)
				osMap = &EC2PricingData{
					Reserved: &m,
					OnDemand: "0",
				}
				regionMap[platform] = osMap
			}
			return osMap.(*EC2PricingData)
		}

		// Process the on demand pricing
		for _, offerMapping := range rawRegion.regionData.Terms.OnDemand {
			for _, offer := range offerMapping {
				// Get the instance in question
				skuData, ok := sku2SkuData[offer.SKU]
				if !ok {
					continue
				}
				instance := skuData.instance
				platform := skuData.platform

				// Get the price dimension
				if len(offer.PriceDimensions) != 1 {
					log.Fatalln("EC2 Pricing data has more than one price dimension for on demand", offer.SKU, instance.InstanceType)
				}
				var priceDimension RegionPriceDimension
				for _, priceDimension = range offer.PriceDimensions {
					// Intentionally empty - this just gets the first one
				}

				// Get the price
				if priceDimension.PricePerUnit != nil {
					usd, ok := priceDimension.PricePerUnit["USD"]
					if ok {
						usdFloat, err := strconv.ParseFloat(usd, 64)
						if err != nil {
							log.Fatalln(
								"Unable to parse EC2 pricing data for",
								offer.SKU,
								instance.InstanceType,
								priceDimension.PricePerUnit,
							)
						}
						pricingData := getPricingData(instance, platform)
						if usdFloat == 0 {
							// No such thing as a free lunch
							continue
						}
						pricingData.OnDemand = formatPrice(usdFloat)
					}
				}
			}
		}

		// Process the reserved pricing
		for _, offerMapping := range rawRegion.regionData.Terms.Reserved {
			for _, offer := range offerMapping {
				// Get the instance in question
				skuData, ok := sku2SkuData[offer.SKU]
				if !ok {
					continue
				}

				// Process this reserved offer
				processReservedOffer(
					getPricingData(skuData.instance, skuData.platform),
					offer.PriceDimensions,
					offer.TermAttributes,
				)
			}
		}

		// Set the region description
		if regionDescription == "" {
			log.Fatalln("EC2 Region description missing for", rawRegion.regionName)
		} else {
			regionDescriptions[rawRegion.regionName] = regionDescription
		}
	}

	// Add spot pricing
	addSpotPricing(instancesHashmap, regionDescriptions)

	// Add EBS pricing
	addEBSPricing(instancesHashmap)

	// Add T2 credits
	addT2Credits(instancesHashmap)

	// Invert the regions map
	regionsInverted := make(map[string]string)
	for region, regionName := range regionDescriptions {
		regionsInverted[regionName] = region
	}

	// Some hacks to make some AWS API expectations work
	regionsInverted["AWS GovCloud (US)"] = "us-gov-west-1"
	regionsInverted["EU (Spain)"] = "eu-south-2"
	regionsInverted["EU (Zurich)"] = "eu-central-2"

	// Add EMR pricing
	addEmrPricing(instancesHashmap, regionsInverted)

	// Add GPU information
	addGpuInfo(instancesHashmap)

	// Add placement group information
	addPlacementGroupInfo(instancesHashmap)

	// Add dedicated host pricing
	addDedicatedHostPricing(instancesHashmap, regionsInverted)

	// Add spot interrupt information
	addSpotInterruptInfo(instancesHashmap)

	// Add Linux AMI info
	addLinuxAmiInfo(instancesHashmap)

	// Add VPC only instances
	addVpcOnlyInstances(instancesHashmap)

	// Clean up empty regions and set the regions map for non-empty regions
	for _, instance := range instancesHashmap {
		instance.Regions = cleanEmptyRegions(instance.Pricing, regionDescriptions)
	}

	// Save the instances
	sortedInstances := make([]*EC2Instance, 0, len(instancesHashmap))
	for _, instance := range instancesHashmap {
		sortedInstances = append(sortedInstances, instance)
	}
	sort.Slice(sortedInstances, func(i, j int) bool {
		return sortedInstances[i].InstanceType < sortedInstances[j].InstanceType
	})
	utils.SaveInstances(sortedInstances, "www/instances.json")
}
