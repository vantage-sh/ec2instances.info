import { PricingUnit } from "@/types";
import { CostDuration } from "@/types";
import {
    calculateCost,
    regex,
    makeCellWithRegexSorter,
    expr,
    transformAllDataTables,
} from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import sortByInstanceType from "../sortByInstanceType";

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

function getPricingSorter(
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    getter: (
        pricing: RedshiftPricing[string] | undefined,
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
            return sortByInstanceType(valueA, valueB, ".");
        },
        cell: (info) => {
            const value = info.getValue() as string;
            return (
                <RegionLinkPreloader
                    onClick={(e) => e.stopPropagation()}
                    href={`/aws/redshift/${value}`}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
    },
    {
        accessorKey: "memory",
        header: "Instance Memory",
        id: "memory",
        sortingFn: "alphanumeric",
        filterFn: expr,
        cell: (info) => `${info.getValue()} GiB`,
    },
    {
        accessorKey: "vcpu",
        header: "vCPUs",
        id: "vCPU",
        filterFn: expr,
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
        filterFn: expr,
    },
    {
        accessorKey: "io",
        header: "IO",
        id: "io",
        sortingFn: "alphanumeric",
        filterFn: expr,
    },
    {
        accessorKey: "ecu",
        header: "ECU",
        id: "ECU",
        sortingFn: "alphanumeric",
        filterFn: expr,
    },
    {
        accessorKey: "currentGeneration",
        header: "Generation",
        id: "generation",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("currentGeneration", (info) => {
            if (info.getValue() === "Yes") return "current";
            return "previous";
        }),
    },
    {
        accessorKey: "pricing",
        header: "On Demand Cost",
        id: "cost-ondemand",
        sortingFn: "alphanumeric",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => {
                return pricing?.ondemand;
            },
        ),
    },
    {
        accessorKey: "pricing",
        header: "Reserved Cost",
        id: "cost-reserved",
        sortingFn: "alphanumeric",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.reserved?.[reservedTerm],
        ),
    },
];
