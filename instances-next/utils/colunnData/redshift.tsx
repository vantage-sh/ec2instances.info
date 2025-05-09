import { PricingUnit } from "@/types";
import { CostDuration } from "@/types";
import {
    makeSchemaWithDefaults,
    doAllDataTablesMigrations,
    gt,
    calculateCost,
} from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

type RedshiftPricing = {
    [region: string]: {
        ondemand: string;
        reserved?: {
            [term: string]: string;
        };
    };
};

export type Instance = {
    pretty_name: string;
    instance_type: string;
    family: string;
    memory: string;
    vcpu: string;
    storage: string;
    io: string;
    ecu: string;
    generation: string;
    currentGeneration: string;
    slices_per_node: string;
    node_range: string;
    storage_per_node: string;
    storage_capacity: string;
    pricing: RedshiftPricing;
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
    return doAllDataTablesMigrations(
        "/redshift",
        initialColumnsArr,
        initialColumnsValue,
    );
}

export function makePrettyNames<V>(
    makeColumnOption: (
        key: keyof typeof initialColumnsValue,
        label: string,
    ) => V,
) {
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
        accessorKey: "instance_type",
        header: "API Name",
        id: "instance_type",
        sortingFn: "alphanumeric",
        cell: (info) => {
            const value = info.getValue() as string;
            return (
                <Link
                    onClick={(e) => e.stopPropagation()}
                    href={`/aws/redshift/${value}`}
                >
                    {value}
                </Link>
            );
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
    },
    {
        accessorKey: "io",
        header: "IO",
        id: "io",
        sortingFn: "alphanumeric",
        filterFn: gt,
    },
    {
        accessorKey: "ecu",
        header: "ECU",
        id: "ECU",
        sortingFn: "alphanumeric",
        filterFn: gt,
    },
    {
        accessorKey: "currentGeneration",
        header: "Generation",
        id: "generation",
        sortingFn: "alphanumeric",
        cell: (info) => {
            if (info.getValue() === "Yes") return "current";
            return "previous";
        },
    },
    {
        accessorKey: "pricing",
        header: "On Demand Cost",
        id: "cost-ondemand",
        sortingFn: "alphanumeric",
        cell: (info) => {
            const pricing = info.getValue() as RedshiftPricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.ondemand,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        },
    },
    {
        accessorKey: "pricing",
        header: "Reserved Cost",
        id: "cost-reserved",
        sortingFn: "alphanumeric",
        cell: (info) => {
            const pricing = info.getValue() as RedshiftPricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.reserved?.[reservedTerm],
                info.row.original,
                pricingUnit,
                costDuration,
            );
        },
    },
];
