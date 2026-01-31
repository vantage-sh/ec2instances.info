import type { GCPInstance } from "./colunnData/gcp";
import type { Table } from "./ec2TablesGenerator";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function gcpTablesGenerator(
    instance: Omit<GCPInstance, "pricing">,
): Table[] {
    return [
        {
            nameKey: "compute",
            slug: "Compute",
            rows: [
                {
                    nameKey: "vCPUs",
                    children: instance.vCPU,
                },
                {
                    nameKey: "memoryGiB",
                    children: instance.memory,
                },
                {
                    nameKey: "memoryPerVCPU",
                    children: round(instance.memory / instance.vCPU),
                },
                {
                    nameKey: "sharedCpu",
                    children: instance.shared_cpu,
                    bgStyled: true,
                },
                {
                    nameKey: "gpu",
                    children: instance.GPU ?? 0,
                    bgStyled: true,
                },
                {
                    nameKey: "gpuModel",
                    children: instance.GPU_model || "N/A",
                },
                {
                    nameKey: "gpuMemory",
                    children: instance.GPU_memory || 0,
                },
                {
                    nameKey: "acceleratorType",
                    children: instance.accelerator_type || "N/A",
                },
            ],
        },
        {
            nameKey: "storage",
            slug: "Storage",
            rows: [
                {
                    nameKey: "localSsd",
                    children: instance.local_ssd,
                    bgStyled: true,
                },
                {
                    nameKey: "localSsdSize",
                    children: instance.local_ssd_size || 0,
                },
            ],
        },
        {
            nameKey: "networking",
            slug: "Networking",
            rows: [
                {
                    nameKey: "networkPerformance",
                    children: instance.network_performance || "Unknown",
                },
            ],
        },
        {
            nameKey: "gcp",
            slug: "GCP",
            rows: [
                {
                    nameKey: "instanceType",
                    children: instance.instance_type,
                },
                {
                    nameKey: "prettyName",
                    children: instance.pretty_name,
                },
                {
                    nameKey: "family",
                    children: instance.family,
                },
                {
                    nameKey: "generation",
                    children: instance.generation || "Unknown",
                },
                {
                    nameKey: "computeOptimized",
                    children: instance.compute_optimized ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "memoryOptimized",
                    children: instance.memory_optimized ?? false,
                    bgStyled: true,
                },
            ],
        },
    ];
}
