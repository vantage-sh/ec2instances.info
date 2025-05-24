import { ColumnDef } from "@tanstack/react-table";
import {
    calculateCost,
    doAllDataTablesMigrations,
    gt,
    makeSchemaWithDefaults,
    regex,
    makeCellWithRegexSorter,
} from "./shared";
import { EC2Instance, PricingUnit, CostDuration, Pricing } from "@/types";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import sortByInstanceType from "../sortByInstanceType";

const initialColumnsArr = [
    ["pretty_name", true],
    ["instance_type", true],
    ["memory", true],
    ["vcpus", true],
    ["networkperf", true],
    ["cost-ondemand-redis", true],
    ["cost-reserved-redis", true],
    ["cost-ondemand-memcached", true],
    ["cost-reserved-memcached", true],
    ["cost-ondemand-valkey", true],
    ["cost-reserved-valkey", true],
    ["generation", false],
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
        "/cache/",
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
        makeColumnOption("vcpus", "vCPUs"),
        makeColumnOption("networkperf", "Network Performance"),
        makeColumnOption("cost-ondemand-redis", "Redis Cost"),
        makeColumnOption("cost-reserved-redis", "Redis Reserved Cost"),
        makeColumnOption("cost-ondemand-memcached", "Memcached On Demand Cost"),
        makeColumnOption("cost-reserved-memcached", "Memcached Reserved Cost"),
        makeColumnOption("cost-ondemand-valkey", "Valkey On Demand Cost"),
        makeColumnOption("cost-reserved-valkey", "Valkey Reserved Cost"),
        makeColumnOption("generation", "Generation"),
    ];
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
): ColumnDef<EC2Instance>[] => [
    {
        accessorKey: "pretty_name",
        id: "pretty_name",
        header: "Name",
        sortingFn: "alphanumeric",
        filterFn: regex({}),
    },
    {
        accessorKey: "instance_type",
        id: "instance_type",
        header: "API Name",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.instance_type;
            const valueB = rowB.original.instance_type;
            return sortByInstanceType(valueA, valueB, ".", "cache.");
        },
        filterFn: regex({}),
        cell: (info) => {
            const value = info.getValue() as string;
            return (
                <RegionLinkPreloader
                    onClick={(e) => e.stopPropagation()}
                    href={`/aws/elasticache/${value}`}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
    },
    {
        accessorKey: "memory",
        id: "memory",
        filterFn: gt,
        sortingFn: "alphanumeric",
        header: "Memory",
        cell: (info) => {
            const value = info.getValue();
            return `${value} GiB`;
        },
    },
    {
        accessorKey: "vcpu",
        id: "vcpus",
        filterFn: (row, _, filterValue) => gt(row, "vcpu", filterValue),
        sortingFn: "alphanumeric",
        header: "vCPUs",
        cell: (info) => {
            const value = info.getValue();
            return `${value} vCPUs`;
        },
    },
    {
        accessorKey: "network_performance",
        id: "networkperf",
        sortingFn: "alphanumeric",
        header: "Network Performance",
        filterFn: regex({}),
    },
    {
        accessorKey: "pricing",
        id: "cost-ondemand-redis",
        header: "Redis Cost",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.Redis?.ondemand,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved-redis",
        header: "Redis Reserved Cost",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.Redis?.reserved?.[reservedTerm],
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        id: "cost-ondemand-memcached",
        header: "Memcached On Demand Cost",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.Memcached?.ondemand,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved-memcached",
        header: "Memcached Reserved Cost",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.Memcached?.reserved?.[reservedTerm],
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        id: "cost-ondemand-valkey",
        header: "Valkey On Demand Cost",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.Valkey?.ondemand,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved-valkey",
        header: "Valkey Reserved Cost",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing;
            const region = pricing[selectedRegion];
            if (!region) return "N/A";
            return calculateCost(
                region.Valkey?.reserved?.[reservedTerm],
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "currentGeneration",
        id: "generation",
        header: "Generation",
        sortingFn: "alphanumeric",
        // @ts-expect-error: This accessor is not typed right now.
        ...makeCellWithRegexSorter("currentGeneration", (info) => {
            if (info.getValue() === "Yes") return "current";
            return "previous";
        }),
    },
];
