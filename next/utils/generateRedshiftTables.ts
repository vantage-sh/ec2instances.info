import { Table } from "./ec2TablesGenerator";
import { Instance } from "./colunnData/redshift";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function generateRedshiftTables(instance: Instance): Table[] {
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
                    nameKey: "memory",
                    children: instance.memory,
                },
                {
                    nameKey: "memoryPerVCPU",
                    children: (() => {
                        const n1 = Number(instance.memory);
                        const n2 = Number(instance.vcpu);
                        if (isNaN(n1) || isNaN(n2)) {
                            return "N/A";
                        }
                        return round(n1 / n2);
                    })(),
                },
                {
                    nameKey: "slicesPerNode",
                    children: instance.slices_per_node,
                },
                {
                    nameKey: "nodeRange",
                    children: instance.node_range,
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
                {
                    nameKey: "ioGibps",
                    children: instance.io,
                },
                {
                    nameKey: "ecu",
                    children: instance.ecu,
                },
                {
                    nameKey: "maxStoragePerNode",
                    children: instance.storage_per_node,
                },
                {
                    nameKey: "maxStorageCapacity",
                    children: instance.storage_capacity,
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
