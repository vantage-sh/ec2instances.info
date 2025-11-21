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
            name: "Compute",
            slug: "Compute",
            rows: [
                {
                    name: "vCPUs",
                    children: instance.vCPU,
                },
                {
                    name: "Memory (GiB)",
                    children: instance.memory,
                },
                {
                    name: "Memory per vCPU (GiB)",
                    children: round(instance.memory / instance.vCPU),
                },
                {
                    name: "Shared CPU",
                    children: instance.shared_cpu,
                    bgStyled: true,
                },
                {
                    name: "GPU",
                    children: instance.GPU ?? 0,
                    bgStyled: true,
                },
                {
                    name: "GPU Model",
                    children: instance.GPU_model || "N/A",
                },
                {
                    name: "GPU Memory (GiB)",
                    children: instance.GPU_memory || 0,
                },
                {
                    name: "Accelerator Type",
                    children: instance.accelerator_type || "N/A",
                },
            ],
        },
        {
            name: "Storage",
            slug: "Storage",
            rows: [
                {
                    name: "Local SSD",
                    children: instance.local_ssd,
                    bgStyled: true,
                },
                {
                    name: "Local SSD Size (GB)",
                    children: instance.local_ssd_size || 0,
                },
            ],
        },
        {
            name: "Networking",
            slug: "Networking",
            rows: [
                {
                    name: "Network Performance",
                    children: instance.network_performance || "Unknown",
                },
            ],
        },
        {
            name: "GCP",
            slug: "GCP",
            rows: [
                {
                    name: "Instance Type",
                    children: instance.instance_type,
                },
                {
                    name: "Pretty Name",
                    children: instance.pretty_name,
                },
                {
                    name: "Family",
                    children: instance.family,
                },
                {
                    name: "Generation",
                    children: instance.generation || "Unknown",
                },
                {
                    name: "Compute Optimized",
                    children: instance.compute_optimized ?? false,
                    bgStyled: true,
                },
                {
                    name: "Memory Optimized",
                    children: instance.memory_optimized ?? false,
                    bgStyled: true,
                },
            ],
        },
    ];
}
