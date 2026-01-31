import { ColumnDef } from "@tanstack/react-table";
import {
    regex,
    makeCellWithRegexSorter,
    expr,
    transformAllDataTables,
} from "./shared";
import { EC2Instance, PricingUnit, CostDuration } from "@/types";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import sortByInstanceType from "../sortByInstanceType";
import { getPricingSorter, Locals } from "./ec2/columns";
import { prefixWithLocale } from "@/utils/locale";

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
        makeColumnOption("vcpus", t?.("columns.common.vCPUs") ?? "vCPUs"),
        makeColumnOption("networkperf", t?.("columns.common.networkPerformance") ?? "Network Performance"),
        makeColumnOption("cost-ondemand-redis", t?.("columns.cache.redisCost") ?? "Redis Cost"),
        makeColumnOption("cost-reserved-redis", t?.("columns.cache.redisReserved") ?? "Redis Reserved Cost"),
        makeColumnOption("cost-ondemand-memcached", t?.("columns.cache.memcachedOnDemand") ?? "Memcached On Demand Cost"),
        makeColumnOption("cost-reserved-memcached", t?.("columns.cache.memcachedReserved") ?? "Memcached Reserved Cost"),
        makeColumnOption("cost-ondemand-valkey", t?.("columns.cache.valkeyOnDemand") ?? "Valkey On Demand Cost"),
        makeColumnOption("cost-reserved-valkey", t?.("columns.cache.valkeyReserved") ?? "Valkey Reserved Cost"),
        makeColumnOption("generation", t?.("columns.common.generation") ?? "Generation"),
    ];
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
): ColumnDef<EC2Instance>[] => {
    const t = locals?.t;
    const locale = locals?.locale;
    return [
    {
        accessorKey: "pretty_name",
        id: "pretty_name",
        header: t?.("columns.common.name") ?? "Name",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "pretty_name" }),
    },
    {
        accessorKey: "instance_type",
        id: "instance_type",
        header: t?.("columns.common.apiName") ?? "API Name",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.instance_type;
            const valueB = rowB.original.instance_type;
            return sortByInstanceType(valueA, valueB, ".", "cache.");
        },
        filterFn: regex({ accessorKey: "instance_type" }),
        cell: (info) => {
            const value = info.getValue() as string;
            return (
                <RegionLinkPreloader
                    onClick={(e) => e.stopPropagation()}
                    href={prefixWithLocale(`/aws/elasticache/${value}`, locale ?? "en")}
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
        id: "memory",
        filterFn: expr,
        sortingFn: "alphanumeric",
        header: t?.("columns.common.memory") ?? "Memory",
        cell: (info) => {
            const value = info.getValue();
            return `${value} GiB`;
        },
    },
    {
        accessorKey: "vcpu",
        id: "vcpus",
        filterFn: (row, _, filterValue) => expr(row, "vcpu", filterValue),
        sortingFn: "alphanumeric",
        header: t?.("columns.common.vCPUs") ?? "vCPUs",
        cell: (info) => {
            const value = info.getValue();
            return `${value} vCPUs`;
        },
    },
    {
        accessorKey: "network_performance",
        id: "networkperf",
        sortingFn: "alphanumeric",
        header: t?.("columns.common.networkPerformance") ?? "Network Performance",
        filterFn: regex({ accessorKey: "network_performance" }),
    },
    {
        accessorKey: "pricing",
        id: "cost-ondemand-redis",
        header: t?.("columns.cache.redisCost") ?? "Redis Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.Redis?.ondemand,
            true,
            currency,
        ),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved-redis",
        header: t?.("columns.cache.redisReserved") ?? "Redis Reserved Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.Redis?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        accessorKey: "pricing",
        id: "cost-ondemand-memcached",
        header: t?.("columns.cache.memcachedOnDemand") ?? "Memcached On Demand Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.Memcached?.ondemand,
            true,
            currency,
        ),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved-memcached",
        header: t?.("columns.cache.memcachedReserved") ?? "Memcached Reserved Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.Memcached?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        accessorKey: "pricing",
        id: "cost-ondemand-valkey",
        header: t?.("columns.cache.valkeyOnDemand") ?? "Valkey On Demand Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.Valkey?.ondemand,
            true,
            currency,
        ),
    },
    {
        accessorKey: "pricing",
        id: "cost-reserved-valkey",
        header: t?.("columns.cache.valkeyReserved") ?? "Valkey Reserved Cost",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.Valkey?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        accessorKey: "currentGeneration",
        id: "generation",
        header: t?.("columns.common.generation") ?? "Generation",
        sortingFn: "alphanumeric",
        // @ts-expect-error: This accessor is not typed right now.
        ...makeCellWithRegexSorter("currentGeneration", (info) => {
            if (info.getValue() === "Yes") return "current";
            return "previous";
        }),
    },
];
};
