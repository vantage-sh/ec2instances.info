import type { AzureInstance } from "./colunnData/azure";
import type { Table } from "./ec2TablesGenerator";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

// TODO: Add the rest of the tables and rows

export default function azureTablesGenerator(instance: Omit<AzureInstance, "pricing">): Table[] {
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
            ],
        },
    ];
}
