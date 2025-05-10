import { PricingUnit } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { doAllDataTablesMigrations, gt } from "./shared";
import { makeSchemaWithDefaults } from "./shared";
import { CostDuration } from "@/types";
import Link from "next/link";

interface AzurePricing {
    [region: string]: {
        [platform: string]: {
            ondemand: number;
            reserved: {
                [key: string]: number;
            };
            spot_min?: number;
        };
    };
}

interface Storage {
    size: number;
}

export type AzureInstance = {
    instance_type: string;
    pretty_name: string;
    pretty_name_azure: string;
    pricing: AzurePricing;
    vcpu: number;
    memory: number;
    GPU: number;
    family: string;
    storage?: Storage;
    ACU?: number;
};

const initialColumnsArr = [
    ["pretty_name_azure", true],
    ["instance_type", true],
    ["memory", true],
    ["vcpu", true],
    ["memory_per_vcpu", false],
    ["GPU", false],
    ["size", true],
    ["linux-ondemand", true],
    ["linux-savings", true],
    ["linux-reserved", true],
    ["linux-spot", true],
    ["windows-ondemand", true],
    ["windows-savings", true],
    ["windows-reserved", true],
    ["windows-spot", true],
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
        "/azure",
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
        makeColumnOption("pretty_name_azure", "Name"),
        makeColumnOption("instance_type", "API Name"),
        makeColumnOption("memory", "Instance Memory"),
        makeColumnOption("vcpu", "vCPUs"),
        makeColumnOption("memory_per_vcpu", "Memory per vCPU"),
        makeColumnOption("GPU", "GPUs"),
        makeColumnOption("size", "Storage"),
        makeColumnOption("linux-ondemand", "Linux On-Demand"),
        makeColumnOption("linux-savings", "Linux Savings"),
        makeColumnOption("linux-reserved", "Linux Reserved"),
        makeColumnOption("linux-spot", "Linux Spot"),
        makeColumnOption("windows-ondemand", "Windows On-Demand"),
        makeColumnOption("windows-savings", "Windows Savings"),
        makeColumnOption("windows-reserved", "Windows Reserved"),
        makeColumnOption("windows-spot", "Windows Spot"),
    ];
}

function round(value: number) {
    return Math.round(value * 100) / 100;
}

function calculateCost(
    price: string | number | undefined,
    instance: AzureInstance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
): number {
    if (!price) return -1;

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
        pricingUnitModifier = instance[
            pricingUnit === "vcpu"
                ? "vcpu"
                : pricingUnit === "ecu"
                  ? "ACU"
                  : "memory"
        ] as number;
    }

    return (Number(price) * durationMultiplier) / pricingUnitModifier;
}

export function calculateAndFormatCost(
    price: string | number | undefined,
    instance: AzureInstance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
): string {
    const perTime = calculateCost(price, instance, pricingUnit, costDuration);
    if (perTime === -1) return "unavailable";

    const precision =
        costDuration === "secondly" || costDuration === "minutely" ? 6 : 4;

    const measuringUnits = {
        instances: "",
        vcpu: "vCPU",
        ecu: "ACU",
        memory: "GiB",
    };

    let durationText: string = costDuration;
    if (costDuration === "secondly") durationText = "per sec";
    if (costDuration === "minutely") durationText = "per min";

    const pricingMeasuringUnits =
        pricingUnit === "instance"
            ? ` ${durationText}`
            : ` ${durationText} / ${measuringUnits[pricingUnit]}`;

    return `$${perTime.toFixed(precision)}${pricingMeasuringUnits}`;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
): ColumnDef<AzureInstance>[] => {
    const savingsKey = reservedTerm.replace("Standard", "Savings");

    return [
        {
            accessorKey: "pretty_name_azure",
            id: "pretty_name_azure",
            header: "Name",
            sortingFn: "alphanumeric",
        },
        {
            accessorKey: "instance_type",
            id: "instance_type",
            header: "API Name",
            sortingFn: "alphanumeric",
            cell: (info) => {
                const value = info.getValue() as string;
                return (
                    <Link
                        onClick={(e) => e.stopPropagation()}
                        href={`/azure/vm/${value}`}
                    >
                        {info.row.original.pretty_name}
                    </Link>
                );
            },
        },
        {
            accessorKey: "memory",
            header: "Instance Memory",
            size: 160,
            id: "memory",
            sortingFn: "alphanumeric",
            filterFn: gt,
            cell: (info) => `${info.getValue() as number} GiB`,
        },
        {
            accessorKey: "vcpu",
            header: "vCPUs",
            size: 160,
            id: "vcpu",
            sortingFn: "alphanumeric",
            filterFn: gt,
        },
        {
            accessorKey: "memory",
            header: "Memory per vCPU",
            size: 160,
            id: "memory_per_vcpu",
            filterFn: (row, _, filterValue) => {
                const value = row.original.memory;
                const cpu = row.original.vcpu;
                return value / cpu >= filterValue;
            },
            cell: (info) => {
                const value = info.getValue() as number;
                const cpu = info.row.original.vcpu;
                return `${round(value / cpu)} GiB/vCPU`;
            },
        },
        {
            accessorKey: "GPU",
            header: "GPUs",
            size: 160,
            id: "GPU",
        },
        {
            accessorKey: "size",
            header: "Storage",
            size: 160,
            id: "size",
            filterFn: gt,
            cell: (info) => `${info.getValue() as number} GiB`,
        },
        {
            accessorKey: "pricing",
            header: "Linux On Demand cost",
            id: "linux-ondemand",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.linux?.ondemand,
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.linux?.ondemand,
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.linux?.ondemand;
                return calculateAndFormatCost(
                    price,
                    info.row.original,
                    pricingUnit,
                    costDuration,
                );
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux Savings Plan",
            id: "linux-savings",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.linux?.reserved?.[savingsKey],
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.linux?.reserved?.[savingsKey],
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.linux?.reserved?.[savingsKey];
                return calculateAndFormatCost(
                    price,
                    info.row.original,
                    pricingUnit,
                    costDuration,
                );
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux Reserved cost",
            id: "linux-reserved",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.linux?.reserved?.[reservedTerm],
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.linux?.reserved?.[reservedTerm],
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.linux?.reserved?.[reservedTerm];
                return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux Spot cost",
            id: "linux-spot",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.linux?.spot_min,
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.linux?.spot_min,
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.linux?.spot_min;
                return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows On Demand cost",
            id: "windows-ondemand",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.windows?.ondemand,
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.windows?.ondemand,
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.windows?.ondemand;
                return calculateAndFormatCost(
                    price,
                    info.row.original,
                    pricingUnit,
                    costDuration,
                );
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows Savings Plan",
            id: "windows-savings",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.windows?.reserved?.[savingsKey],
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.windows?.reserved?.[savingsKey],
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.windows?.reserved?.[savingsKey];
                return calculateAndFormatCost(
                    price,
                    info.row.original,
                    pricingUnit,
                    costDuration,
                );
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows Reserved cost",
            id: "windows-reserved",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.windows?.reserved?.[reservedTerm],
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.windows?.reserved?.[reservedTerm],
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.windows?.reserved?.[reservedTerm];
                return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows Spot cost",
            id: "windows-spot",
            sortingFn: (rowA, rowB) => {
                const valueA = calculateCost(
                    rowA.original.pricing?.[selectedRegion]?.windows?.spot_min,
                    rowA.original,
                    pricingUnit,
                    costDuration,
                );
                const valueB = calculateCost(
                    rowB.original.pricing?.[selectedRegion]?.windows?.spot_min,
                    rowB.original,
                    pricingUnit,
                    costDuration,
                );
                return valueA - valueB;
            },
            cell: (info) => {
                const pricing = info.getValue() as AzurePricing | undefined;
                const price = pricing?.[selectedRegion]?.windows?.spot_min;
                return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
            },
        },
    ];    
};