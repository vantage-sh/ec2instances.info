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
import { Locals } from "./ec2/columns";
import { prefixWithLocale } from "@/utils/locale";

export interface AzurePricing {
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
    arch: string[];
    iops: number;
    size: number;
    read_io: number;
    cached_disk: number;
    uncached_disk: number;
    uncached_disk_io: number;
    capacity_support: boolean;
    hyperv_generations: string;
    low_priority: boolean;
    vcpus_percore: number;
    vm_deployment: string;
    accelerated_networking: boolean;
    confidential: boolean;
    premium_io: boolean;
    ultra_ssd: boolean;
    encryption: boolean;
    memory_maintenance: boolean;
    rdma: boolean;
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

export function transformDataTables(dataTablesData: any) {
    return transformAllDataTables(initialColumnsArr, dataTablesData);
}

export function makePrettyNames<V>(
    makeColumnOption: (
        key: keyof typeof initialColumnsValue,
        label: string,
    ) => V,
    locals?: Locals,
) {
    const t = locals?.t;
    return [
        makeColumnOption("pretty_name_azure", t?.("columns.common.name") ?? "Name"),
        makeColumnOption("instance_type", t?.("columns.common.apiName") ?? "API Name"),
        makeColumnOption("memory", t?.("columns.common.instanceMemory") ?? "Instance Memory"),
        makeColumnOption("vcpu", t?.("columns.common.vCPUs") ?? "vCPUs"),
        makeColumnOption("memory_per_vcpu", t?.("columns.common.memoryPerVcpu") ?? "Memory per vCPU"),
        makeColumnOption("GPU", t?.("columns.common.gpus") ?? "GPUs"),
        makeColumnOption("size", t?.("columns.common.storage") ?? "Storage"),
        makeColumnOption("linux-ondemand", t?.("columns.azure.linuxOnDemand") ?? "Linux On-Demand"),
        makeColumnOption("linux-savings", t?.("columns.azure.linuxSavings") ?? "Linux Savings"),
        makeColumnOption("linux-reserved", t?.("columns.azure.linuxReserved") ?? "Linux Reserved"),
        makeColumnOption("linux-spot", t?.("columns.azure.linuxSpot") ?? "Linux Spot"),
        makeColumnOption("windows-ondemand", t?.("columns.azure.windowsOnDemand") ?? "Windows On-Demand"),
        makeColumnOption("windows-savings", t?.("columns.azure.windowsSavings") ?? "Windows Savings"),
        makeColumnOption("windows-reserved", t?.("columns.azure.windowsReserved") ?? "Windows Reserved"),
        makeColumnOption("windows-spot", t?.("columns.azure.windowsSpot") ?? "Windows Spot"),
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
            pricingUnit === "vcpu"
                ? "vcpu"
                : pricingUnit === "ecu"
                  ? "ACU"
                  : "memory"
        ] as number;
    }

    return (
        ((Number(price) * durationMultiplier) / pricingUnitModifier) * usdRate
    );
}

export function calculateAndFormatCost(
    price: string | number | undefined,
    instance: AzureInstance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    currency: {
        code: string;
        usdRate: number;
    },
): string | undefined {
    const perTime = calculateCost(
        price,
        instance,
        pricingUnit,
        costDuration,
        currency.usdRate,
    );
    if (perTime === -1) return undefined;

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
    getter: (pricing: AzurePricing[string] | undefined) => number | undefined,
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
            if (isNaN(Number(price))) return undefined;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
                currency,
            );
        }),
    } satisfies Partial<ColumnDef<AzureInstance>>;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
    locals?: Locals,
): ColumnDef<AzureInstance>[] => {
    const t = locals?.t;
    const locale = locals?.locale;
    const savingsKey = reservedTerm.replace("Standard", "Savings");

    return [
        {
            accessorKey: "pretty_name_azure",
            id: "pretty_name_azure",
            header: t?.("columns.common.name") ?? "Name",
            sortingFn: "alphanumeric",
            filterFn: regex({ accessorKey: "pretty_name_azure" }),
        },
        {
            accessorKey: "instance_type",
            id: "instance_type",
            header: t?.("columns.common.apiName") ?? "API Name",
            sortingFn: "alphanumeric",
            cell: (info) => {
                const value = info.getValue() as string;
                return (
                    <RegionLinkPreloader
                        onClick={(e) => e.stopPropagation()}
                        href={prefixWithLocale(`/azure/vm/${value}`, locale ?? "en")}
                    >
                        {info.row.original.pretty_name}
                    </RegionLinkPreloader>
                );
            },
            filterFn: regex({ accessorKey: "instance_type" }),
        },
        {
            accessorKey: "memory",
            header: t?.("columns.common.instanceMemory") ?? "Instance Memory",
            size: 160,
            id: "memory",
            sortingFn: "alphanumeric",
            filterFn: expr,
            cell: (info) => `${info.getValue() as number} GiB`,
        },
        {
            accessorKey: "vcpu",
            header: t?.("columns.common.vCPUs") ?? "vCPUs",
            size: 160,
            id: "vcpu",
            sortingFn: "alphanumeric",
            filterFn: expr,
        },
        {
            accessorKey: "memory",
            header: t?.("columns.common.memoryPerVcpu") ?? "Memory per vCPU",
            size: 160,
            id: "memory_per_vcpu",
            filterFn: (row, _, filterValue) => {
                const value = row.original.memory;
                const cpu = row.original.vcpu;
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
                const cpu = info.row.original.vcpu;
                return `${round(value / cpu)} GiB/vCPU`;
            },
        },
        {
            accessorKey: "GPU",
            header: t?.("columns.common.gpus") ?? "GPUs",
            size: 160,
            id: "GPU",
            filterFn: expr,
        },
        {
            accessorKey: "size",
            header: t?.("columns.common.storage") ?? "Storage",
            size: 160,
            id: "size",
            filterFn: expr,
            cell: (info) => `${info.getValue() as number} GiB`,
        },
        {
            accessorKey: "pricing",
            header: t?.("columns.azure.linuxOnDemand") ?? "Linux On Demand cost",
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
            header: t?.("columns.azure.linuxSavings") ?? "Linux Savings Plan",
            id: "linux-savings",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.linux?.reserved?.[savingsKey],
                currency,
            ),
        },
        {
            accessorKey: "pricing",
            header: t?.("columns.azure.linuxReserved") ?? "Linux Reserved cost",
            id: "linux-reserved",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.linux?.reserved?.[reservedTerm],
                currency,
            ),
        },
        {
            accessorKey: "pricing",
            header: t?.("columns.azure.linuxSpot") ?? "Linux Spot cost",
            id: "linux-spot",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.linux?.spot_min,
                currency,
            ),
        },
        {
            accessorKey: "pricing",
            header: t?.("columns.azure.windowsOnDemand") ?? "Windows On Demand cost",
            id: "windows-ondemand",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.windows?.ondemand,
                currency,
            ),
        },
        {
            accessorKey: "pricing",
            header: t?.("columns.azure.windowsSavings") ?? "Windows Savings Plan",
            id: "windows-savings",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.windows?.reserved?.[savingsKey],
                currency,
            ),
        },
        {
            accessorKey: "pricing",
            header: t?.("columns.azure.windowsReserved") ?? "Windows Reserved cost",
            id: "windows-reserved",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.windows?.reserved?.[reservedTerm],
                currency,
            ),
        },
        {
            accessorKey: "pricing",
            header: t?.("columns.azure.windowsSpot") ?? "Windows Spot cost",
            id: "windows-spot",
            ...getPricingSorter(
                selectedRegion,
                pricingUnit,
                costDuration,
                (pricing) => pricing?.windows?.spot_min,
                currency,
            ),
        },
    ];
};
