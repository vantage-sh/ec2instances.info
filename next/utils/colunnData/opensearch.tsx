import { CostDuration, CostPerGb, PricingUnit } from "@/types";
import {
    calculateCost,
    calculateCostNumeric,
    regex,
    makeCellWithRegexSorter,
    expr,
    transformAllDataTables,
    getStorageHourlyAddon,
} from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import sortByInstanceType from "../sortByInstanceType";

type OpenSearchPricing = {
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
    memoryGib: string;
    vcpu: string;
    storage: string;
    ecu: string;
    pricing: OpenSearchPricing;
    currentGeneration: string;
    family: string;
    memory: string;
    costPerGb?: CostPerGb;
};

const initialColumnsArr = [
    ["pretty_name", true],
    ["instance_type", true],
    ["memory", true],
    ["vcpu", true],
    ["storage", true],
    ["ecu", false],
    ["cost-ondemand", true],
    ["cost-reserved", true],
    ["generation", false],
    ["compute_family", true],
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
        makeColumnOption("pretty_name", "Name"),
        makeColumnOption("instance_type", "API Name"),
        makeColumnOption("compute_family", "Compute Family"),
        makeColumnOption("memory", "Memory"),
        makeColumnOption("vcpu", "vCPUs"),
        makeColumnOption("storage", "Storage"),
        makeColumnOption("ecu", "Elastic Compute Units"),
        makeColumnOption("cost-ondemand", "On Demand Cost"),
        makeColumnOption("cost-reserved", "Reserved Cost"),
        makeColumnOption("generation", "Generation"),
    ] as const;
}

function getPricingSorter(
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    getter: (
        pricing: OpenSearchPricing[string] | undefined,
    ) => string | undefined,
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
    requestedStorageGb: number,
) {
    const storageAddonFor = (instance: { costPerGb?: CostPerGb }) =>
        getStorageHourlyAddon(
            instance.costPerGb,
            requestedStorageGb,
            selectedRegion,
        );
    return {
        sortingFn: "basic" as const,
        sortUndefined: "last",
        accessorFn: (row) => {
            const g = getter(row.pricing?.[selectedRegion]);
            if (isNaN(Number(g)) || !g) return undefined;
            return calculateCostNumeric(
                g,
                row,
                pricingUnit,
                costDuration,
                selectedRegion,
                currency,
                storageAddonFor(row),
            );
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.row.original.pricing;
            const price = getter(pricing?.[selectedRegion]);
            if (isNaN(Number(price)) || !price) return undefined;
            const addon = storageAddonFor(info.row.original);
            const formatted = calculateCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
                selectedRegion,
                currency,
                addon,
            );
            if (addon <= 0) return formatted;
            return renderWithStorageIndicator(
                formatted,
                price,
                addon,
                requestedStorageGb,
                info.row.original.costPerGb,
                selectedRegion,
            );
        }),
    } satisfies Partial<ColumnDef<Instance>>;
}

function renderWithStorageIndicator(
    formatted: string,
    computePriceUsdHr: string,
    storageHourlyAddon: number,
    requestedStorageGb: number,
    costPerGb: CostPerGb | undefined,
    selectedRegion: string,
) {
    const fmt = Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 6,
    });
    const baseline = (() => {
        if (!costPerGb) return 0;
        const b = costPerGb.baseline;
        if (typeof b === "number") return b;
        let min = Infinity;
        for (const k in b) if (b[k] < min) min = b[k];
        return min === Infinity ? 0 : min;
    })();
    const extraGb = Math.max(0, requestedStorageGb - baseline);
    const tooltip =
        `Compute: ${fmt.format(Number(computePriceUsdHr))}/hr\n` +
        `Storage: ${fmt.format(storageHourlyAddon)}/hr` +
        ` (${extraGb} GB × storage rate, ${selectedRegion})`;
    return (
        <span
            title={tooltip}
            className="border-b border-dotted border-current cursor-help"
        >
            {formatted}
        </span>
    );
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
    requestedStorageGb: number,
): ColumnDef<Instance>[] => [
    {
        accessorKey: "pretty_name",
        id: "pretty_name",
        header: "Name",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "pretty_name" }),
    },
    {
        accessorKey: "instance_type",
        id: "instance_type",
        header: "API Name",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.instance_type;
            const valueB = rowB.original.instance_type;
            return sortByInstanceType(valueA, valueB, ".");
        },
        filterFn: regex({ accessorKey: "instance_type" }),
        cell: (info) => {
            const value = info.getValue() as string;
            return (
                <RegionLinkPreloader
                    onClick={(e) => e.stopPropagation()}
                    href={`/aws/opensearch/${value}`}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
    },
    {
        accessorKey: "family",
        header: "Compute Family",
        size: 150,
        id: "compute_family",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "family" }),
    },
    {
        accessorKey: "memoryGib",
        id: "memory",
        header: "Memory",
        filterFn: expr,
        sortingFn: "alphanumeric",
        cell: (info) => {
            const value = info.getValue() as string;
            return `${value} GiB`;
        },
    },
    {
        accessorKey: "vcpu",
        id: "vcpu",
        filterFn: expr,
        sortingFn: "alphanumeric",
        header: "vCPUs",
    },
    {
        accessorKey: "storage",
        id: "storage",
        header: "Storage",
        filterFn: expr,
        sortingFn: "alphanumeric",
    },
    {
        accessorKey: "ecu",
        id: "ecu",
        header: "Elastic Compute Units",
        sortingFn: "alphanumeric",
        filterFn: expr,
    },
    {
        accessorKey: "pricing",
        id: "cost-ondemand",
        header: "On Demand Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.ondemand,
            currency,
            requestedStorageGb,
        ),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved",
        header: "Reserved Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.reserved?.[reservedTerm],
            currency,
            requestedStorageGb,
        ),
    },
    {
        accessorKey: "currentGeneration",
        id: "generation",
        header: "Generation",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("currentGeneration", (info) => {
            if (info.getValue() === "Yes") return "current";
            return "previous";
        }),
    },
];
