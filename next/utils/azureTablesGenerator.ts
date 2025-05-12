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
            name: "Compute",
            slug: "Compute",
            rows: [
                {
                    name: "vCPUs",
                    children: instance.vcpu,
                },
                {
                    name: "Memory (GiB)",
                    children: instance.memory,
                },
                {
                    name: "Memory per vCPU (GiB)",
                    children: round(instance.memory / instance.vcpu),
                },
                {
                    name: "CPU Architecture",
                    children: instance.arch?.[0] || "Unknown",
                },
                {
                    name: "GPU",
                    children: instance.GPU ?? 0,
                    bgStyled: true,
                },
                {
                    name: "Capacity Support",
                    children: instance.capacity_support ?? false,
                    bgStyled: true,
                },
                {
                    name: "VM Generations Supported",
                    children: instance.hyperv_generations,
                },
                {
                    name: "Low Priority",
                    children: instance.low_priority ?? false,
                    bgStyled: true,
                },
                {
                    name: "vCPUs per Physical Core",
                    children: instance.vcpus_percore,
                },
                {
                    name: "VM Deployment Method",
                    children: instance.vm_deployment,
                },
            ],
        },
        {
            name: "Networking",
            slug: "Networking",
            rows: [
                {
                    name: "Accelerated Networking",
                    children: instance.accelerated_networking ?? false,
                    bgStyled: true,
                },
            ],
        },
        {
            name: "Storage",
            slug: "Storage",
            rows: [
                {
                    name: "Local Temp Storage (GiB)",
                    children: instance.size ?? 0,
                },
                {
                    name: "Cached Disk Size with Host Caching (GiB)",
                    children: instance.cached_disk ?? 0,
                },
                {
                    name: "Cached/Temp Storage Throughput (IOPS)",
                    children: instance.iops ?? 0,
                },
                {
                    name: "Cached/Temp Storage Read/Write Throughput (MBps)",
                    children: instance.read_io ?? 0,
                },
                {
                    name: "Uncached Disk Throughput (IOPS)",
                    children: instance.uncached_disk ?? 0,
                },
                {
                    name: "Uncached Disk Read/Write Throughput (MBps)",
                    children: instance.uncached_disk_io ?? 0,
                },
                {
                    name: "Premium I/O",
                    children: instance.premium_io ?? false,
                    bgStyled: true,
                },
                {
                    name: "Ultra Disks Supported",
                    children: instance.ultra_ssd ?? false,
                    bgStyled: true,
                },
                {
                    name: "Encryption",
                    children: instance.encryption ?? false,
                    bgStyled: true,
                },
                {
                    name: "Memory Maintenance",
                    children: instance.memory_maintenance ?? false,
                    bgStyled: true,
                },
            ],
        },
        {
            name: "Azure",
            slug: "Azure",
            rows: [
                {
                    name: "Instance Type",
                    children: instance.instance_type,
                },
                {
                    name: "Instance Name",
                    children: instance.pretty_name_azure,
                },
                {
                    name: "Name",
                    children: instance.pretty_name,
                },
                {
                    name: "Family",
                    children: instance.instance_type.split("-")[0],
                },
                {
                    name: "Confidential",
                    children: instance.confidential ?? false,
                    bgStyled: true,
                },
                {
                    name: "RDMA",
                    children: instance.rdma ?? false,
                    bgStyled: true,
                },
            ],
        },
    ];
}
