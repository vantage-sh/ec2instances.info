package azure

import (
	"log"
	"math"
	"scraper/utils"
	"sort"
	"strconv"
	"strings"
)

type AzureStorage struct {
	NvmeSsd       bool    `json:"nvme_ssd"`
	Devices       int     `json:"devices"`
	Size          int     `json:"size"`
	MaxWriteDisks *string `json:"max_write_disks"`
}

type AzureSpecsData struct {
	InstanceType          string       `json:"instance_type"`
	Storage               AzureStorage `json:"storage"`
	ACU                   int          `json:"ACU,omitempty"`
	MemoryMaintenance     bool         `json:"memory_maintenance"`
	HypervGenerations     *string      `json:"hyperv_generations"`
	Arch                  []string     `json:"arch"`
	LowPriority           bool         `json:"low_priority"`
	PremiumIo             bool         `json:"premium_io"`
	VmDeployment          *string      `json:"vm_deployment"`
	VcpusAvailable        int          `json:"vcpus_available"`
	VcpusPercore          int          `json:"vcpus_percore"`
	Iops                  *int         `json:"iops"`
	ReadIo                int          `json:"read_io"`
	WriteIo               int          `json:"write_io"`
	CachedDisk            int          `json:"cached_disk"`
	UncachedDisk          int          `json:"uncached_disk"`
	UncachedDiskIo        int          `json:"uncached_disk_io"`
	Encryption            bool         `json:"encryption"`
	CapacitySupport       bool         `json:"capacity_support"`
	AcceleratedNetworking bool         `json:"accelerated_networking"`
	Rdma                  bool         `json:"rdma"`
	UltraSsd              bool         `json:"ultra_ssd"`
	Hibernation           *bool        `json:"hibernation"`
	TrustedLaunch         *bool        `json:"trusted_launch"`
	Confidential          bool         `json:"confidential"`
}

func parseSpecs(instance *AzureSpecsData, capabilities []AzureSpecsApiIteratorItemCapability) {
	for _, c := range capabilities {
		switch c.Name {
		case "OSVhdSizeMB":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.Storage.Size = val
			}
		case "ACUs":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.ACU = val
			}
		case "MemoryPreservingMaintenanceSupported":
			instance.MemoryMaintenance = c.Value == "True"
		case "HyperVGenerations":
			instance.HypervGenerations = &c.Value
		case "MaxDataDiskCount":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.Storage.Devices = val
			}
		case "CpuArchitectureType":
			instance.Arch = []string{c.Value}
		case "LowPriorityCapable":
			instance.LowPriority = c.Value == "True"
		case "PremiumIO":
			instance.PremiumIo = c.Value == "True"
		case "VMDeploymentTypes":
			instance.VmDeployment = &c.Value
		case "vCPUsAvailable":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.VcpusAvailable = val
			}
		case "vCPUsPerCore":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.VcpusPercore = val
			}
		case "CombinedTempDiskAndCachedIOPS":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.Iops = &val
			}
		case "CombinedTempDiskAndCachedReadBytesPerSecond":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.ReadIo = int(math.Floor(float64(val) / 1000000))
			}
		case "CombinedTempDiskAndCachedWriteBytesPerSecond":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.WriteIo = int(math.Floor(float64(val) / 1000000))
			}
		case "CachedDiskBytes":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.CachedDisk = int(math.Floor(float64(val) / 1073741824))
			}
		case "UncachedDiskIOPS":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.UncachedDisk = val
			}
		case "UncachedDiskBytesPerSecond":
			if val, err := strconv.Atoi(c.Value); err == nil {
				instance.UncachedDiskIo = int(math.Floor(float64(val) / 1000000))
			}
		case "EncryptionAtHostSupported":
			instance.Encryption = c.Value == "True"
		case "CapacityReservationSupported":
			instance.CapacitySupport = c.Value == "True"
		case "AcceleratedNetworkingEnabled":
			instance.AcceleratedNetworking = c.Value == "True"
		case "RdmaEnabled":
			instance.Rdma = c.Value == "True"
		case "UltraSSDAvailable":
			instance.UltraSsd = c.Value == "True"
		case "HibernationSupported":
			val := c.Value == "True"
			instance.Hibernation = &val
		case "TrustedLaunchDisabled":
			val := c.Value == "True"
			instance.TrustedLaunch = &val
		case "ConfidentialComputingType":
			instance.Confidential = c.Value == "True"
		case "NvmeDiskSizeInMiB":
			instance.Storage.NvmeSsd = c.Value == "True"
		case "MaxWriteAcceleratorDisksAllowed":
			instance.Storage.MaxWriteDisks = &c.Value
		}
	}
}

func processRawSkuSpecs(rawSkus []*AzureSpecsApiIteratorItem) {
	// Make the specs.
	instanceTypes := map[string]*AzureSpecsData{}
	for _, sku := range rawSkus {
		// Brainrot.
		if sku.Size == "" {
			continue
		}
		instanceType := strings.ToLower(strings.ReplaceAll(sku.Size, "_", ""))
		if _, ok := instanceTypes[instanceType]; !ok {
			instanceTypes[instanceType] = &AzureSpecsData{
				InstanceType: instanceType,
			}
		}
		parseSpecs(instanceTypes[instanceType], sku.Capabilities)
	}

	// Sort them.
	specs := make([]*AzureSpecsData, 0, len(instanceTypes))
	for _, spec := range instanceTypes {
		specs = append(specs, spec)
	}
	sort.Slice(specs, func(i, j int) bool {
		return specs[i].InstanceType < specs[j].InstanceType
	})

	// Write them.
	utils.SaveInstances(specs, "www/azure/instances-specs.json")
	log.Default().Println("Wrote instance specs (in case anyone uses them!)")
}
