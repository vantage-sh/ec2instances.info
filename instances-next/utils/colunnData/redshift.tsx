import { PricingUnit } from "@/types";
import { CostDuration } from "@/types";
import { makeSchemaWithDefaults, doAllDataTablesMigrations } from "./shared";
import { ColumnDef, Row } from "@tanstack/react-table";
import Link from "next/link";

type RedshiftPricing = {
    [region: string]: {
        ondemand: string;
        reserved?: {
            [term: string]: string;
        };
    };
}

export type Instance = {
    pretty_name: string;
    instance_type: string;
    memory: string;
    vcpu: string;
    storage: string;
    io: string;
    ecu: string;
    generation: string;
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
    console.log(row.original);
    const value = row.original[columnId.toLowerCase() as keyof Instance];
    // @ts-expect-error: We know this is a string or number.
    const conv = tryConv(value);
    if (isNaN(conv)) return false;
    return conv >= filterValue;
}

function calculateCost(
    price: string | undefined,
    instance: Instance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
) {
    if (!price) return "N/A";

    const hourMultipliers = {
        secondly: 1 / (60 * 60),
        minutely: 1 / 60,
        hourly: 1,
        daily: 24,
        weekly: 7 * 24,
        monthly: (365 * 24) / 12,
        annually: 365 * 24,
    };

    const durationMultiplier = hourMultipliers[costDuration];
    let pricingUnitModifier = 1;

    if (pricingUnit !== "instance") {
        pricingUnitModifier = Number(instance[pricingUnit]);
    }

    return `$${((Number(price) * durationMultiplier) / pricingUnitModifier).toFixed(4)} ${costDuration}`;
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
            return calculateCost(region.ondemand, info.row.original, pricingUnit, costDuration);
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
            return calculateCost(region.reserved?.[reservedTerm], info.row.original, pricingUnit, costDuration);
        },
    },
];
