import { Table } from "./ec2TablesGenerator";
import { Instance } from "./colunnData/redshift";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function generateRedshiftTables(instance: Instance): Table[] {
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
                    name: "Memory",
                    children: instance.memory,
                },
                {
                    name: "Memory per vCPU (GiB)",
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
                    name: "Default Slices per Node",
                    children: instance.slices_per_node,
                },
                {
                    name: "Node Range",
                    children: instance.node_range,
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
                {
                    name: "I/O GiBps",
                    children: instance.io,
                },
                {
                    name: "ECU",
                    children: instance.ecu,
                },
                {
                    name: "Max Storage per Node",
                    children: instance.storage_per_node,
                },
                {
                    name: "Max Storage Capacity",
                    children: instance.storage_capacity,
                },
            ],
        },
        {
            name: "Amazon",
            slug: "Amazon",
            rows: [
                {
                    name: "Generation",
                    children: instance.currentGeneration === "Yes" ? "current" : "previous",
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
