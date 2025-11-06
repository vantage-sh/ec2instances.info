import { PricingUnit } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import {
    regex,
    makeCellWithRegexSorter,
    expr,
    transformAllDataTables,
} from "./shared";
import { CostDuration } from "@/types";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import exprCompiler from "@/utils/expr";

export interface GCPPricing {
    [region: string]: {
        [platform: string]: {
            ondemand: number;
            spot?: number;
        };
    };
}

export type GCPInstance = {
    instance_type: string;
    pretty_name: string;
    pricing: GCPPricing;
    vCPU: number;
    memory: number;
    GPU: number;
    family: string;
    network_performance: string;
    generation: string;
};

const initialColumnsArr = [
    ["pretty_name", true],
    ["instance_type", true],
    ["memory", true],
    ["vCPU", true],
    ["memory_per_vcpu", false],
    ["GPU", false],
    ["linux-ondemand", true],
    ["linux-spot", true],
] as const;

export const initialColumnsValue: {
    [idx in (typeof initialColumnsArr)[number][0]]: boolean;
} = {} as any;
for (const [key, value] of initialColumnsArr) {
    initialColumnsValue[key] = value;
}

export function transformDataTables(dataTablesData: any) {
    return transformAllDataTables(initialColumnsArr, dataTablesData);
}

export function makePrettyNames<V>(
    makeColumnOption: (
        key: keyof typeof initialColumnsValue,
        label: string,
    ) => V,
) {
    return [
        makeColumnOption("instance_type", "API Name"),
        makeColumnOption("memory", "Instance Memory"),
        makeColumnOption("vCPU", "vCPUs"),
        makeColumnOption("memory_per_vcpu", "Memory per vCPU"),
        makeColumnOption("GPU", "GPUs"),
        makeColumnOption("linux-ondemand", "Linux On-Demand"),
        makeColumnOption("linux-spot", "Linux Spot"),
    ];
}

function round(value: number) {
    return Math.round(value * 100) / 100;
}

function calculateCost(
    price: string | number | undefined,
    instance: GCPInstance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    usdRate: number,
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
            pricingUnit === "vcpu" ? "vCPU" : "memory"
        ] as number;
    }

    return (
        ((Number(price) * durationMultiplier) / pricingUnitModifier) * usdRate
    );
}

export function calculateAndFormatCost(
    price: string | number | undefined,
    instance: GCPInstance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    currency: {
        code: string;
        usdRate: number;
    },
): string {
    const perTime = calculateCost(
        price,
        instance,
        pricingUnit,
        costDuration,
        currency.usdRate,
    );
    if (perTime === -1) return "unavailable";

    const precision =
        costDuration === "secondly" || costDuration === "minutely" ? 6 : 4;

    const measuringUnits = {
        instances: "",
        vcpu: "vCPU",
        ecu: "vCPU",
        memory: "GiB",
    };

    let durationText: string = costDuration;
    if (costDuration === "secondly") durationText = "per sec";
    if (costDuration === "minutely") durationText = "per min";

    const pricingMeasuringUnits =
        pricingUnit === "instance"
            ? ` ${durationText}`
            : ` ${durationText} / ${measuringUnits[pricingUnit]}`;

    const currencyData = Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.code,
        maximumFractionDigits: precision,
    }).format(perTime);

    return `${currencyData}${pricingMeasuringUnits}`;
}

function getPricingSorter(
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    getter: (pricing: GCPPricing[string] | undefined) => number | undefined,
    currency: {
        code: string;
        usdRate: number;
    },
) {
    return {
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                getter(rowA.original.pricing?.[selectedRegion]),
                rowA.original,
                pricingUnit,
                costDuration,
                currency.usdRate,
            );
            const valueB = calculateCost(
                getter(rowB.original.pricing?.[selectedRegion]),
                rowB.original,
                pricingUnit,
                costDuration,
                currency.usdRate,
            );
            return valueA - valueB;
        },
        sortUndefined: "last",
        accessorFn: (row) => {
            const g = getter(row.pricing?.[selectedRegion]);
            if (isNaN(Number(g))) return undefined;
            const value = calculateCost(
                g,
                row,
                pricingUnit,
                costDuration,
                currency.usdRate,
            );
            return value === -1 ? undefined : value;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.row.original.pricing;
            const price = getter(pricing?.[selectedRegion]);
            if (isNaN(Number(price))) return "unavailable";
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
                currency,
            );
        }),
    } satisfies Partial<ColumnDef<GCPInstance>>;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    _reservedTerm: string, // GCP doesn't use reserved terms, but we need to match the signature
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
): ColumnDef<GCPInstance>[] => {
    return [
        {
            accessorKey: "instance_type",
            id: "instance_type",
            header: "API Name",
            sortingFn: "alphanumeric",
            cell: (info) => {
                const value = info.getValue() as string;
                return (
                    <RegionLinkPreloader
                        onClick={(e) => e.stopPropagation()}
                        href={`/gcp/${value}`}
                    >
                        {info.row.original.pretty_name}
                    </RegionLinkPreloader>
                );
            },
            filterFn: regex({ accessorKey: "instance_type" }),
        },
        {
            accessorKey: "memory",
            header: "Instance Memory",
            size: 160,
            id: "memory",
            sortingFn: "alphanumeric",
            filterFn: expr,
            cell: (info) => `${info.getValue() as number} GiB`,
        },
        {
            accessorKey: "vCPU",
            header: "vCPUs",
            size: 160,
            id: "vCPU",
            sortingFn: "alphanumeric",
            filterFn: expr,
        },
        {
            accessorKey: "memory",
            header: "Memory per vCPU",
            size: 160,
            id: "memory_per_vcpu",
            filterFn: (row, _, filterValue) => {
                const value = row.original.memory;
                const cpu = row.original.vCPU;
                const memoryPerVcpu = round(value / cpu);
                try {
                    return exprCompiler(filterValue)(
                        memoryPerVcpu,
                        `${memoryPerVcpu} GiB/vCPU`,
                    );
                } catch {
                    return true;
                }
            },
            cell: (info) => {
                const value = info.getValue() as number;
                const cpu = info.row.original.vCPU;
                return `${round(value / cpu)} GiB/vCPU`;
            },
        },
        {
            accessorKey: "GPU",
            header: "GPUs",
            size: 160,
            id: "GPU",
            filterFn: expr,
        },
        {
            accessorKey: "pricing",
            header: "Linux On Demand cost",
            id: "linux-ondemand",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.linux?.ondemand,
                currency,
            ),
        },
        {
            accessorKey: "pricing",
            header: "Linux Spot cost",
            id: "linux-spot",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.linux?.spot,
                currency,
            ),
        },
    ];
};
