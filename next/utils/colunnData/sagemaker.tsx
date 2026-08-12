import { CostDuration, EC2Instance, PricePrecision, PricingUnit } from "@/types";
import {
    calculateCost,
    calculateCostNumeric,
    regex,
    makeCellWithRegexSorter,
    transformAllDataTables,
    expr,
} from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import sortByInstanceType from "../sortByInstanceType";
import { commitmentTypeLabel } from "../dataMappings";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";

type SageMakerPricing = {
    [region: string]: {
        ondemand: string;
        reserved?: {
            [term: string]: string;
        };
    };
};

export type Instance = Partial<Omit<EC2Instance, "pricing" | "storage">> & {
    pretty_name: string;
    instance_type: string;
    family: string;
    pricing: SageMakerPricing;
    regions: { [region: string]: string };
    compute_family?: string;
    storage?: string;
};

const initialColumnsArr = [
    ["pretty_name", true],
    ["instance_type", true],
    ["family", true],
    ["compute_family", true],
    ["memory", true],
    ["vCPU", true],
    ["network_performance", true],
    ["GPU", true],
    ["GPU_model", false],
    ["storage", false],
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

export function transformDataTables(dataTablesData: any) {
    return transformAllDataTables(initialColumnsArr, dataTablesData);
}

export function makePrettyNames<V>(
    makeColumnOption: (
        key: keyof typeof initialColumnsValue,
        label: string,
    ) => V,
    reservedTerm: string,
) {
    const commitmentLabel: string = commitmentTypeLabel(reservedTerm);
    return [
        makeColumnOption("pretty_name", "Name"),
        makeColumnOption("instance_type", "API Name"),
        makeColumnOption("family", "Family"),
        makeColumnOption("compute_family", "Compute Family"),
        makeColumnOption("memory", "Memory"),
        makeColumnOption("vCPU", "vCPUs"),
        makeColumnOption("network_performance", "Network Performance"),
        makeColumnOption("GPU", "GPUs"),
        makeColumnOption("GPU_model", "GPU Model"),
        makeColumnOption("storage", "Storage"),
        makeColumnOption("generation", "Generation"),
        makeColumnOption("cost-ondemand", "On Demand Cost"),
        makeColumnOption("cost-reserved", `${commitmentLabel} Cost`),
    ] as const;
}

function getPricingSorter(
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    pricePrecision: PricePrecision,
    getter: (
        pricing: SageMakerPricing[string] | undefined,
    ) => string | undefined,
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
) {
    return {
        sortingFn: "basic" as const,
        sortUndefined: "last",
        accessorFn: (row: Instance) => {
            const g = getter(row.pricing?.[selectedRegion]);
            if (isNaN(Number(g)) || !g) return undefined;
            return calculateCostNumeric(
                g,
                row,
                pricingUnit,
                costDuration,
                selectedRegion,
                currency,
            );
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.row.original.pricing;
            const price = getter(pricing?.[selectedRegion]);
            if (isNaN(Number(price)) || !price) return undefined;
            return calculateCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
                selectedRegion,
                currency,
                pricePrecision,
            );
        }),
    } satisfies Partial<ColumnDef<Instance>>;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    pricePrecision: PricePrecision,
    reservedTerm: string,
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
): ColumnDef<Instance>[] => [
    {
        accessorKey: "pretty_name",
        header: "Name",
        id: "pretty_name",
        size: 350,
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "pretty_name" }),
        cell: (info) => info.getValue() as string,
    },
    {
        accessorKey: "instance_type",
        header: "API Name",
        id: "instance_type",
        filterFn: regex({ accessorKey: "instance_type" }),
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.instance_type;
            const valueB = rowB.original.instance_type;
            return sortByInstanceType(valueA, valueB, ".", "ml.");
        },
        cell: (info) => {
            const value = info.getValue() as string;
            return (
                <RegionLinkPreloader
                    onClick={(e) => e.stopPropagation()}
                    href={`/aws/sagemaker/${value}`}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
    },
    {
        accessorKey: "family",
        header: "Family",
        id: "family",
        size: 120,
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "family" }),
    },
    {
        accessorKey: "compute_family",
        header: "Compute Family",
        id: "compute_family",
        size: 150,
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "compute_family" }),
    },
    {
        accessorKey: "memory",
        header: "Memory",
        id: "memory",
        sortingFn: "alphanumeric",
        filterFn: expr,
        cell: (info) => `${info.getValue()} GiB`,
    },
    {
        accessorKey: "vCPU",
        header: "vCPUs",
        id: "vCPU",
        sortingFn: "alphanumeric",
        filterFn: expr,
        cell: (info) => `${info.getValue()} vCPUs`,
    },
    {
        accessorKey: "network_performance",
        header: "Network Performance",
        id: "network_performance",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "network_performance" }),
    },
    {
        accessorKey: "GPU",
        header: "GPUs",
        id: "GPU",
        sortingFn: "alphanumeric",
        filterFn: expr,
    },
    {
        accessorKey: "GPU_model",
        header: "GPU Model",
        id: "GPU_model",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "GPU_model" }),
    },
    {
        accessorKey: "storage",
        header: "Storage",
        id: "storage",
        sortingFn: "alphanumeric",
        filterFn: expr,
    },
    {
        accessorKey: "generation",
        header: "Generation",
        id: "generation",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "generation" }),
    },
    {
        accessorKey: "pricing",
        header: "On Demand Cost",
        id: "cost-ondemand",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            pricePrecision,
            (pricing) => pricing?.ondemand,
            currency,
        ),
    },
    {
        accessorKey: "pricing",
        header: `${commitmentTypeLabel(reservedTerm)} Cost`,
        id: "cost-reserved",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            pricePrecision,
            (pricing) => pricing?.reserved?.[reservedTerm],
            currency,
        ),
    },
];
