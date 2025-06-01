import { CostDuration, PricingUnit } from "@/types";
import { calculateCost, regex, makeCellWithRegexSorter, expr } from "./shared";
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
] as const;

export const initialColumnsValue: {
    [idx in (typeof initialColumnsArr)[number][0]]: boolean;
} = {} as any;
for (const [key, value] of initialColumnsArr) {
    initialColumnsValue[key] = value;
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
) {
    return {
        sortUndefined: "last",
        accessorFn: (row) => {
            const g = getter(row.pricing?.[selectedRegion]);
            if (isNaN(Number(g)) || !g) return undefined;
            return calculateCost(g, row, pricingUnit, costDuration);
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.row.original.pricing;
            const price = getter(pricing?.[selectedRegion]);
            if (isNaN(Number(price)) || !price) return "unavailable";
            return calculateCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    } satisfies Partial<ColumnDef<Instance>>;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
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
        sortingFn: "alphanumeric",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.ondemand,
        ),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved",
        header: "Reserved Cost",
        sortingFn: "alphanumeric",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.reserved?.[reservedTerm],
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
