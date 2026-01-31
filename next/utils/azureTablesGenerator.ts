import type { AzureInstance } from "./colunnData/azure";
import type { Table } from "./ec2TablesGenerator";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function azureTablesGenerator(
    instance: Omit<AzureInstance, "pricing">,
): Table[] {
    return [
        {
            nameKey: "compute",
            slug: "Compute",
            rows: [
                {
                    nameKey: "vCPUs",
                    children: instance.vcpu,
                },
                {
                    nameKey: "memoryGiB",
                    children: instance.memory,
                },
                {
                    nameKey: "memoryPerVCPU",
                    children: round(instance.memory / instance.vcpu),
                },
                {
                    nameKey: "cpuArchitecture",
                    children: instance.arch?.[0] || "Unknown",
                },
                {
                    nameKey: "gpu",
                    children: instance.GPU ?? 0,
                    bgStyled: true,
                },
                {
                    nameKey: "capacitySupport",
                    children: instance.capacity_support ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "vmGenerations",
                    children: instance.hyperv_generations,
                },
                {
                    nameKey: "lowPriority",
                    children: instance.low_priority ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "vcpusPerCore",
                    children: instance.vcpus_percore,
                },
                {
                    nameKey: "vmDeployment",
                    children: instance.vm_deployment,
                },
            ],
        },
        {
            nameKey: "networking",
            slug: "Networking",
            rows: [
                {
                    nameKey: "acceleratedNetworking",
                    children: instance.accelerated_networking ?? false,
                    bgStyled: true,
                },
            ],
        },
        {
            nameKey: "storage",
            slug: "Storage",
            rows: [
                {
                    nameKey: "localTempStorage",
                    children: instance.size ?? 0,
                },
                {
                    nameKey: "cachedDiskSize",
                    children: instance.cached_disk ?? 0,
                },
                {
                    nameKey: "cachedTempStorageIops",
                    children: instance.iops ?? 0,
                },
                {
                    nameKey: "cachedTempStorageThroughput",
                    children: instance.read_io ?? 0,
                },
                {
                    nameKey: "uncachedDiskIops",
                    children: instance.uncached_disk ?? 0,
                },
                {
                    nameKey: "uncachedDiskThroughput",
                    children: instance.uncached_disk_io ?? 0,
                },
                {
                    nameKey: "premiumIo",
                    children: instance.premium_io ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "ultraDisks",
                    children: instance.ultra_ssd ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "encryption",
                    children: instance.encryption ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "memoryMaintenance",
                    children: instance.memory_maintenance ?? false,
                    bgStyled: true,
                },
            ],
        },
        {
            nameKey: "azure",
            slug: "Azure",
            rows: [
                {
                    nameKey: "instanceType",
                    children: instance.instance_type,
                },
                {
                    nameKey: "instanceName",
                    children: instance.pretty_name_azure,
                },
                {
                    nameKey: "name",
                    children: instance.pretty_name,
                },
                {
                    nameKey: "family",
                    children: instance.instance_type.split("-")[0],
                },
                {
                    nameKey: "confidential",
                    children: instance.confidential ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "rdma",
                    children: instance.rdma ?? false,
                    bgStyled: true,
                },
            ],
        },
    ];
}
