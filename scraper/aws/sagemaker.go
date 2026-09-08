package aws

import (
	"log"
	"scraper/aws/awsutils"
	ec2gpu "scraper/aws/ec2"
	"scraper/utils"
	"sort"
	"strconv"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

const sageMakerProductFamily = "ML Instance"
const sageMakerNotebookComponent = "Notebook"

type (
	InstanceName = string
	CurrencyCode = string
)

type SageMakerInstance struct {
	InstanceType          string                            `json:"instance_type"`
	PrettyName            string                            `json:"pretty_name"`
	Family                string                            `json:"family"`
	ComputeFamily         string                            `json:"compute_family,omitempty"`
	VCPU                  float64                           `json:"vCPU"`
	Memory                float64                           `json:"memory"`
	NetworkPerformance    string                            `json:"network_performance,omitempty"`
	GPU                   float64                           `json:"GPU"`
	GPUModel              *string                           `json:"GPU_model,omitempty"`
	Generation            string                            `json:"generation,omitempty"`
	Storage               string                            `json:"storage,omitempty"`
	EBSOptimized          bool                              `json:"ebs_optimized"`
	EBSBaselineThroughput float64                           `json:"ebs_baseline_throughput"`
	EBSBaselineIOPS       int                               `json:"ebs_baseline_iops"`
	EBSBaselineBandwidth  int                               `json:"ebs_baseline_bandwidth"`
	EBSThroughput         float64                           `json:"ebs_throughput"`
	EBSIOPS               int                               `json:"ebs_iops"`
	EBSMaxBandwidth       int                               `json:"ebs_max_bandwidth"`
	Pricing               map[string]*genericAwsPricingData `json:"pricing"`
	Regions               map[string]string                 `json:"regions"`
}

// SAGEMAKER_FAMILY_NAMES maps platoinstancename (e.g. "m5", "g4dn") to a display
// prefix for AddPrettyName. Instance types are stripped of the "ml." prefix first.
var SAGEMAKER_FAMILY_NAMES = map[string]string{
	"c4":    "C4 Compute Optimized",
	"c5":    "C5 Compute Optimized",
	"c5d":   "C5 Compute Optimized",
	"c5n":   "C5n Compute Optimized",
	"c6a":   "C6a Compute Optimized",
	"c6g":   "C6g Compute Optimized Graviton",
	"c6gd":  "C6gd Compute Optimized Graviton",
	"c6gn":  "C6gn Compute Optimized Graviton",
	"c6i":   "C6i Compute Optimized",
	"c6id":  "C6id Compute Optimized",
	"c7g":   "C7g Compute Optimized Graviton",
	"c7i":   "C7i Compute Optimized",
	"c8g":   "C8g Compute Optimized Graviton",
	"g4dn":  "G4dn Graphics and Machine Learning GPU",
	"g5":    "G5 Graphics and Machine Learning GPU",
	"g6":    "G6 Graphics and Machine Learning GPU",
	"g6e":   "G6e Graphics and Machine Learning GPU",
	"g7":    "G7 Graphics and Machine Learning GPU",
	"g7e":   "G7e Graphics and Machine Learning GPU",
	"inf1":  "Inf1 AWS Inferentia",
	"inf2":  "Inf2 AWS Inferentia",
	"m4":    "M4 General Purpose",
	"m5":    "M5 General Purpose",
	"m5d":   "M5 General Purpose",
	"m6a":   "M6a General Purpose",
	"m6g":   "M6g General Purpose Graviton",
	"m6gd":  "M6gd General Purpose Graviton",
	"m6i":   "M6i General Purpose",
	"m6id":  "M6id General Purpose",
	"m7g":   "M7g General Purpose Graviton",
	"m7i":   "M7i General Purpose",
	"m8g":   "M8g General Purpose Graviton",
	"p3dn":  "P3dn High Performance GPU",
	"p4d":   "P4d Highest Performance GPU",
	"p4de":  "P4de Highest Performance GPU",
	"p5":    "P5 High Performance GPU",
	"p5en":  "P5en High Performance GPU",
	"p6":    "P6 High Performance GPU",
	"p6e":   "P6e High Performance GPU",
	"r5":    "R5 Memory Optimized",
	"r5d":   "R5 Memory Optimized",
	"r6g":   "R6g Memory Optimized Graviton",
	"r6gd":  "R6gd Memory Optimized Graviton",
	"r6i":   "R6i Memory Optimized",
	"r6id":  "R6id Memory Optimized",
	"r7i":   "R7i Memory Optimized",
	"r8g":   "R8g Memory Optimized Graviton",
	"t2":    "T2 General Purpose",
	"t3":    "T3 General Purpose",
	"trn1":  "Trn1 AWS Trainium",
	"trn1n": "Trn1n AWS Trainium",
}

func newSageMakerInstance(instanceName InstanceName, platoInstanceFamily string) *SageMakerInstance {
	return &SageMakerInstance{
		InstanceType: string(instanceName),
		PrettyName:   sageMakerPrettyName(instanceName),
		Family:       platoInstanceFamily,
		Pricing:      make(map[string]*genericAwsPricingData),
	}
}

func enrichSageMakerInstance(
	instance *SageMakerInstance,
	productAttributes map[string]string,
	ec2InstanceTypes *utils.SlowBuildingMap[string, *types.InstanceTypeInfo],
) {
	if vcpu := productAttributes["vCpu"]; vcpu != "" {
		if vcpuCount, err := strconv.ParseFloat(vcpu, 64); err == nil {
			instance.VCPU = vcpuCount
		}
	}

	if memory := productAttributes["memory"]; memory != "" {
		memory = strings.Split(memory, " ")[0]
		if memoryGiB, err := strconv.ParseFloat(memory, 64); err == nil {
			instance.Memory = memoryGiB
		}
	}

	if generation := productAttributes["currentGeneration"]; generation != "" && generation != "NA" {
		instance.Generation = generation
	}
	if storage := productAttributes["storage"]; storage != "" && storage != "NA" {
		instance.Storage = storage
	}

	if platoInstanceFamily := productAttributes["platoinstancename"]; platoInstanceFamily != "" {
		instance.Family = platoInstanceFamily
	}
	if instanceFamily := productAttributes["instanceFamily"]; instanceFamily != "" {
		instance.ComputeFamily = instanceFamily
	} else if computeType := productAttributes["computeType"]; computeType != "" {
		instance.ComputeFamily = computeType
	} else if platoInstanceFamily := productAttributes["platoinstancename"]; platoInstanceFamily != "" {
		instance.ComputeFamily = platoInstanceFamily
	}
	if networkPerformance := productAttributes["networkPerformance"]; networkPerformance != "" && networkPerformance != "NA" {
		instance.NetworkPerformance = networkPerformance
	}

	ec2InstanceType := strings.TrimPrefix(instance.InstanceType, "ml.")
	if instance.PrettyName == "" {
		instance.PrettyName = awsutils.AddPrettyName(ec2InstanceType, SAGEMAKER_FAMILY_NAMES)
	}

	if strings.HasPrefix(ec2InstanceType, "inf") || strings.HasPrefix(ec2InstanceType, "trn") {
		instance.GPU = 0
		instance.GPUModel = nil
	} else if info, ok := ec2gpu.LookupGPUInfo(ec2InstanceType); ok {
		instance.GPU = info.Count
		instance.GPUModel = &info.Model
	} else if gpu := productAttributes["gpu"]; gpu != "" {
		if gpuCount, err := strconv.ParseFloat(gpu, 64); err == nil {
			instance.GPU = gpuCount
			if gpuCount > 0 {
				utils.SendWarning("GPU data missing for", ec2InstanceType)
			}
		}
	}

	ec2InstanceTypeInfo, found := ec2InstanceTypes.Get(ec2InstanceType)
	if !found || ec2InstanceTypeInfo.EbsInfo == nil || ec2InstanceTypeInfo.EbsInfo.EbsOptimizedInfo == nil {
		return
	}

	ebsInfo := ec2InstanceTypeInfo.EbsInfo.EbsOptimizedInfo
	instance.EBSOptimized = true
	instance.EBSBaselineThroughput = *ebsInfo.BaselineThroughputInMBps
	instance.EBSBaselineIOPS = int(*ebsInfo.BaselineIops)
	instance.EBSBaselineBandwidth = int(*ebsInfo.BaselineBandwidthInMbps)
	instance.EBSThroughput = *ebsInfo.MaximumThroughputInMBps
	instance.EBSIOPS = int(*ebsInfo.MaximumIops)
	instance.EBSMaxBandwidth = int(*ebsInfo.MaximumBandwidthInMbps)
}

func sageMakerPrettyName(instanceName InstanceName) string {
	return awsutils.AddPrettyName(strings.TrimPrefix(string(instanceName), "ml."), SAGEMAKER_FAMILY_NAMES)
}

// isValidSageMakerSku reports whether product is a regional SageMaker ML Instance
// pricing SKU (not labeling, serverless, storage, etc.). When true, instanceName
// is the ml.* type (e.g. "ml.m5.xlarge").
func isValidSageMakerSku(product awsutils.RegionProduct) (instanceName InstanceName, ok bool) {
	if product.ProductFamily != sageMakerProductFamily {
		return "", false
	}
	if product.Attributes["locationType"] != "AWS Region" {
		return "", false
	}
	instanceName = InstanceName(product.Attributes["instanceName"])
	if instanceName == "" {
		return "", false
	}
	return instanceName, true
}

// isNotebookSageMakerSku is isValidSageMakerSku plus component == "Notebook", the
// canonical on-demand pricing SKU for now. Hosting/Processing can be added later
// if Notebook coverage has gaps. We do this because we don't want to add multiple SKU's
// that have the same instanceName and the same price, only differing in component.
func isNotebookSageMakerSku(product awsutils.RegionProduct) (instanceName InstanceName, ok bool) {
	instanceName, ok = isValidSageMakerSku(product)
	if !ok {
		return "", false
	}
	if product.Attributes["component"] != sageMakerNotebookComponent {
		return "", false
	}
	return instanceName, true
}

func processSageMakerData(
	regionData chan awsutils.RawRegion,
	china bool,
	ec2InstanceTypes *utils.SlowBuildingMap[string, *types.InstanceTypeInfo],
) {
	currency := CurrencyCode("USD")
	if china {
		currency = "CNY"
	}

	instancesByName := make(map[InstanceName]*SageMakerInstance)
	skuToInstance := make(map[awsutils.Sku]*SageMakerInstance)
	regionDescriptions := make(map[string]string)

	var savingsPlan awsutils.SavingsPlanGetter
	for region := range regionData {
		if region.SavingsPlanData != nil {
			savingsPlan = region.SavingsPlanData
			close(regionData)
			break
		}

		for _, product := range region.RegionData.Products {
			instanceName, ok := isNotebookSageMakerSku(product)
			if !ok {
				continue
			}

			instance, ok := instancesByName[instanceName]
			if !ok {
				instance = newSageMakerInstance(instanceName, product.Attributes["platoinstancename"])
				instancesByName[instanceName] = instance
			}

			sku := awsutils.Sku(product.SKU)
			skuToInstance[sku] = instance
			enrichSageMakerInstance(instance, product.Attributes, ec2InstanceTypes)

			if location := product.Attributes["location"]; location != "" {
				regionDescriptions[region.RegionName] = location
			}
		}

		for _, offerMapping := range region.RegionData.Terms.OnDemand {
			for _, offer := range offerMapping {
				instance, ok := skuToInstance[awsutils.Sku(offer.SKU)]
				if !ok {
					continue // not a Notebook SKU we indexed
				}

				if len(offer.PriceDimensions) != 1 {
					log.Fatalln("More than one price dimension for SKU", offer.SKU)
				}

				var priceDimension awsutils.RegionPriceDimension
				for _, priceDimension = range offer.PriceDimensions {
					// intentionally empty — just gets the first one
				}

				regionPricing := instance.Pricing[region.RegionName]
				if regionPricing == nil {
					regionPricing = &genericAwsPricingData{Reserved: make(map[string]float64)}
					instance.Pricing[region.RegionName] = regionPricing
				}

				regionPricing.OnDemand = awsutils.Floaty(priceDimension.PricePerUnit[string(currency)])
			}
		}
	}

	for regionName, skuMap := range savingsPlan() {
		for sku, termPrices := range skuMap {
			instance, ok := skuToInstance[sku]
			if !ok {
				continue
			}
			for term, price := range termPrices {
				regionPricing := instance.Pricing[string(regionName)]
				if regionPricing == nil {
					regionPricing = &genericAwsPricingData{Reserved: make(map[string]float64)}
					instance.Pricing[string(regionName)] = regionPricing
				}
				regionPricing.Reserved[string(term)] = price
			}
		}
	}

	for _, instance := range instancesByName {
		instance.Regions = clearHalfEmptyRegions(instance.Pricing, regionDescriptions)
	}

	instancesSorted := make([]*SageMakerInstance, 0, len(instancesByName))
	for _, instance := range instancesByName {
		// deal with weird chinese instances with no pricing dimensions (ml.t3.quartermicro)
		if len(instance.Pricing) == 0 {
			continue
		}
		instancesSorted = append(instancesSorted, instance)
	}
	sort.Slice(instancesSorted, func(i, j int) bool {
		return instancesSorted[i].InstanceType < instancesSorted[j].InstanceType
	})

	filepath := "www/sagemaker/instances.json"
	if china {
		filepath = "www/sagemaker/instances-cn.json"
	}
	utils.SaveInstances(instancesSorted, filepath)
}
