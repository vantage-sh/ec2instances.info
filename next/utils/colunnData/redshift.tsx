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
import { Locals } from "./ec2/columns";
import { prefixWithLocale } from "@/utils/locale";

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
    locals?: Locals,
) {
    const t = locals?.t;
    return [
        makeColumnOption("pretty_name", t?.("columns.common.name") ?? "Name"),
        makeColumnOption("instance_type", t?.("columns.common.apiName") ?? "API Name"),
        makeColumnOption("compute_family", t?.("columns.common.computeFamily") ?? "Compute Family"),
        makeColumnOption("memory", t?.("columns.common.memory") ?? "Memory"),
        makeColumnOption("vCPU", t?.("columns.common.vCPUs") ?? "vCPUs"),
        makeColumnOption("storage", t?.("columns.common.storage") ?? "Storage"),
        makeColumnOption("io", "IO"),
        makeColumnOption("ECU", t?.("columns.ec2.computeUnitsEcu") ?? "Compute Units (ECU)"),
        makeColumnOption("generation", t?.("columns.common.generation") ?? "Generation"),
        makeColumnOption("cost-ondemand", t?.("columns.pricing.onDemand") ?? "On Demand Cost"),
        makeColumnOption("cost-reserved", t?.("columns.pricing.reserved") ?? "Reserved Cost"),
    ];
}

function getPricingSorter(
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    getter: (
        pricing: RedshiftPricing[string] | undefined,
    ) => string | undefined,
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
) {
    return {
        sortUndefined: "last",
        accessorFn: (row) => {
            const g = getter(row.pricing?.[selectedRegion]);
            if (isNaN(Number(g)) || !g) return undefined;
            return calculateCost(
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
            );
        }),
    } satisfies Partial<ColumnDef<Instance>>;
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
): ColumnDef<Instance>[] => {
    const t = locals?.t;
    const locale = locals?.locale;
    return [
    {
        accessorKey: "pretty_name",
        header: t?.("columns.common.name") ?? "Name",
        id: "pretty_name",
        size: 350,
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "pretty_name" }),
        cell: (info) => info.getValue() as string,
    },
    {
        accessorKey: "instance_type",
        header: t?.("columns.common.apiName") ?? "API Name",
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
                    href={prefixWithLocale(`/aws/redshift/${value}`, locale ?? "en")}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
    },
    {
        accessorKey: "family",
        header: t?.("columns.common.computeFamily") ?? "Compute Family",
        size: 150,
        id: "compute_family",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "family" }),
    },
    {
        accessorKey: "memory",
        header: t?.("columns.common.instanceMemory") ?? "Instance Memory",
        id: "memory",
        sortingFn: "alphanumeric",
        filterFn: expr,
        cell: (info) => `${info.getValue()} GiB`,
    },
    {
        accessorKey: "vcpu",
        header: t?.("columns.common.vCPUs") ?? "vCPUs",
        id: "vCPU",
        filterFn: expr,
        cell: (info) => {
            const value = info.getValue();
            return `${value} vCPUs`;
        },
    },
    {
        accessorKey: "storage",
        header: t?.("columns.common.storage") ?? "Storage",
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
        header: t?.("columns.ec2.computeUnitsEcu") ?? "ECU",
        id: "ECU",
        sortingFn: "alphanumeric",
        filterFn: expr,
    },
    {
        accessorKey: "currentGeneration",
        header: t?.("columns.common.generation") ?? "Generation",
        id: "generation",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("currentGeneration", (info) => {
            if (info.getValue() === "Yes") return "current";
            return "previous";
        }),
    },
    {
        accessorKey: "pricing",
        header: t?.("columns.pricing.onDemand") ?? "On Demand Cost",
        id: "cost-ondemand",
        sortingFn: "alphanumeric",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => {
                return pricing?.ondemand;
            },
            currency,
        ),
    },
    {
        accessorKey: "pricing",
        header: t?.("columns.pricing.reserved") ?? "Reserved Cost",
        id: "cost-reserved",
        sortingFn: "alphanumeric",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.reserved?.[reservedTerm],
            currency,
        ),
    },
];
};
