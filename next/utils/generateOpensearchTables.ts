import { Table } from "./ec2TablesGenerator";
import { Instance } from "./colunnData/opensearch";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function generateOpensearchTables(instance: Instance): Table[] {
    return [
        {
            name: "Compute",
            slug: "Compute",
            rows: [
                {
                    name: "CPUs",
                    children: instance.vcpu,
                },
                {
                    name: "Memory (GiB)",
                    children: instance.memory,
                },
                {
                    name: "Memory per vCPU (GiB)",
                    children: round(
                        Number(instance.memory) / Number(instance.vcpu),
                    ),
                },
            ],
        },
        {
            name: "Storage",
            slug: "Storage",
            rows: [
                {
                    name: "Storage",
                    children: instance.storage,
                },
            ],
        },
        {
            name: "Amazon",
            slug: "Amazon",
            rows: [
                {
                    name: "Generation",
                    children:
                        instance.currentGeneration === "Yes"
                            ? "current"
                            : "previous",
                    bgStyled: true,
                },
                {
                    name: "Instance Type",
                    children: instance.instance_type,
                },
                {
                    name: "Family",
                    children: instance.family,
                },
                {
                    name: "Name",
                    children: instance.pretty_name,
                },
            ],
        },
    ];
}
