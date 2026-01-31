import { Table } from "./ec2TablesGenerator";
import { Instance } from "./colunnData/opensearch";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function generateOpensearchTables(instance: Instance): Table[] {
    return [
        {
            nameKey: "compute",
            slug: "Compute",
            rows: [
                {
                    nameKey: "cpus",
                    children: instance.vcpu,
                },
                {
                    nameKey: "memoryGiB",
                    children: instance.memory,
                },
                {
                    nameKey: "memoryPerVCPU",
                    children: round(
                        Number(instance.memory) / Number(instance.vcpu),
                    ),
                },
            ],
        },
        {
            nameKey: "storage",
            slug: "Storage",
            rows: [
                {
                    nameKey: "storageField",
                    children: instance.storage,
                },
            ],
        },
        {
            nameKey: "amazon",
            slug: "Amazon",
            rows: [
                {
                    nameKey: "generation",
                    children:
                        instance.currentGeneration === "Yes"
                            ? "current"
                            : "previous",
                    bgStyled: true,
                },
                {
                    nameKey: "instanceType",
                    children: instance.instance_type,
                },
                {
                    nameKey: "family",
                    children: instance.family,
                },
                {
                    nameKey: "name",
                    children: instance.pretty_name,
                },
            ],
        },
    ];
}
