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
                    name: "GPU",
                    children: instance.GPU ?? 0,
                    bgStyled: true,
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
            ],
        },
    ];
}
