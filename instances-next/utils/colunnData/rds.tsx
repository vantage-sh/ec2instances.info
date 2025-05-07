import { CostDuration, EC2Instance, PricingUnit } from "@/types";
import { makeSchemaWithDefaults, doAllDataTablesMigrations, gt } from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";


const initialColumnsArr = [
    ["pretty_name", true],
    ["instance_type", true],
    ["memory", true],
    ["vcpu", true],
    ["storage", true],
] as const;

export const initialColumnsValue: {
    [idx in (typeof initialColumnsArr)[number][0]]: boolean;
} = {} as any;
for (const [key, value] of initialColumnsArr) {
    initialColumnsValue[key] = value;
}

export function makeColumnVisibilitySchema() {
    return makeSchemaWithDefaults(initialColumnsValue);
}

export function doDataTablesMigration() {
    return doAllDataTablesMigrations("/rds", initialColumnsArr, initialColumnsValue);
}

export function makePrettyNames<V>(makeColumnOption: (key: keyof typeof initialColumnsValue, label: string) => V) {
    return [
        makeColumnOption("pretty_name", "Name"),
        makeColumnOption("instance_type", "API Name"),
        makeColumnOption("memory", "Memory"),
        makeColumnOption("vcpu", "vCPUs"),
        makeColumnOption("storage", "Storage"),
    ] as const;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
): ColumnDef<EC2Instance>[] => [
    {
        header: "Name",
        accessorKey: "pretty_name",
        sortingFn: "alphanumeric",
    },
    {
        header: "API Name",
        accessorKey: "instance_type",
        sortingFn: "alphanumeric",
        cell: (info) => {
            const value = info.getValue() as string;
            return <Link onClick={(e) => e.stopPropagation()} href={`/aws/rds/${value}`}>{value}</Link>;
        },
    },
    {
        header: "Memory",
        id: "memory",
        accessorKey: "memory",
        filterFn: gt,
        sortingFn: "alphanumeric",
    },
    {
        header: "vCPUs",
        id: "vcpu",
        accessorKey: "vcpu",
        filterFn: gt,
        sortingFn: "alphanumeric",
    },
    {
        header: "Storage",
        id: "storage",
        accessorKey: "storage",
        filterFn: gt,
        sortingFn: "alphanumeric",
    },
];
