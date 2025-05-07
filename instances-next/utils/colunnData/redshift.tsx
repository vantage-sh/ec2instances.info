import { PricingUnit, Pricing } from "@/types";
import { CostDuration } from "@/types";
import { makeSchemaWithDefaults, doAllDataTablesMigrations } from "./shared";
import { ColumnDef, Row } from "@tanstack/react-table";
import Link from "next/link";

export type Instance = {
    pretty_name: string;
    instance_type: string;
    memory: string;
    vcpu: string;
    storage: string;
    io: string;
    ECU: string;
    generation: string;
    pricing: Pricing;
};

const initialColumnsArr = [
    ["pretty_name", true],
    ["instance_type", true],
    ["memory", true],
    ["vCPU", true],
    ["storage", true],
    ["io", true],
    ["ECU", false],
    ["generation", false],
    ["cost-ondemand", true],
    ["cost-reserved", true],
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
    return doAllDataTablesMigrations("/redshift", initialColumnsArr, initialColumnsValue);
}

export function makePrettyNames<V>(makeColumnOption: (key: keyof typeof initialColumnsValue, label: string) => V) {
    return [
        makeColumnOption("pretty_name", "Name"),
        makeColumnOption("instance_type", "API Name"),
        makeColumnOption("memory", "Memory"),
        makeColumnOption("vCPU", "vCPUs"),
        makeColumnOption("storage", "Storage"),
        makeColumnOption("io", "IO"),
        makeColumnOption("ECU", "Compute Units (ECU)"),
        makeColumnOption("generation", "Generation"),
        makeColumnOption("cost-ondemand", "On Demand Cost"),
        makeColumnOption("cost-reserved", "Reserved Cost"),
    ];
}

const NOT_NUMBER_OR_DOT = /[^0-9.]/g;

function tryConv(value: string | number) {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const n = Number(value);
        if (isNaN(n)) {
            const s = value.split(" ")[0].replace(NOT_NUMBER_OR_DOT, "");
            const n2 = Number(s);
            if (!isNaN(n2)) return n2;
            return NaN;
        }
        return n;
    }
    return NaN;
}

function gt(row: Row<Instance>, columnId: string, filterValue: number) {
    const value = row.original[columnId as keyof Instance];
    // @ts-expect-error: We know this is a string or number.
    const conv = tryConv(value);
    if (isNaN(conv)) return false;
    return conv >= filterValue;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
): ColumnDef<Instance>[] => [
    {
        accessorKey: "pretty_name",
        header: "Name",
        id: "pretty_name",
        size: 350,
        sortingFn: "alphanumeric",
        cell: (info) => info.getValue() as string,
    },
    {
        accessorKey: "instanceType",
        header: "API Name",
        id: "instance_type",
        sortingFn: "alphanumeric",
        cell: (info) => {
            const value = info.getValue() as string;
            return <Link onClick={(e) => e.stopPropagation()} href={`/aws/redshift/${value}`}>{value}</Link>;
        },
    },
    {
        accessorKey: "memory",
        header: "Instance Memory",
        id: "memory",
        sortingFn: "alphanumeric",
        filterFn: gt,
        cell: (info) => `${info.getValue()} GiB`,
    },
    {
        accessorKey: "vcpu",
        header: "vCPUs",
        id: "vCPU",
        filterFn: gt,
        cell: (info) => {
            const value = info.getValue();
            return `${value} vCPUs`;
        },
    },
    {
        accessorKey: "storage",
        header: "Storage",
        id: "storage",
        sortingFn: "alphanumeric",
        filterFn: gt,
        cell: (info) => `${info.getValue()} GiB`,
    },
];
