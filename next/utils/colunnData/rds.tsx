import { CostDuration, EC2Instance, PricingUnit } from "@/types";
import {
    makeSchemaWithDefaults,
    doAllDataTablesMigrations,
    regex,
    makeCellWithRegexSorter,
    expr,
} from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import { getPricingSorter } from "./ec2/columns";
import sortByInstanceType from "../sortByInstanceType";

const initialColumnsArr = [
    ["name", true],
    ["apiname", true],
    ["memory", true],
    ["storage", true],
    ["ebs-throughput", false],
    ["physical_processor", false],
    ["vcpus", true],
    ["networkperf", true],
    ["architecture", false],
    ["cost-ondemand-14", true],
    ["cost-reserved-14t", true],
    ["cost-ondemand-2", true],
    ["cost-reserved-2", true],
    ["cost-ondemand-10", true],
    ["cost-reserved-10", true],
    ["cost-ondemand-11", true],
    ["cost-reserved-11", true],
    ["cost-ondemand-12", true],
    ["cost-reserved-12", true],
    ["cost-ondemand-15", true],
    ["cost-reserved-15", true],
    ["cost-ondemand-21", true],
    ["cost-reserved-21", true],
    ["cost-ondemand-211", true],
    ["cost-ondemand-18", true],
    ["cost-reserved-18", true],
    ["cost-ondemand-5", true],
    ["cost-reserved-5", true],
    ["ebs-baseline-bandwidth", false],
    ["ebs-baseline-throughput", false],
    ["ebs-baseline-iops", false],
    ["ebs-max-bandwidth", false],
    ["ebs-max-throughput", false],
    ["ebs-iops", false],
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
        "/rds/",
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
        makeColumnOption("name", "Name"),
        makeColumnOption("apiname", "API Name"),
        makeColumnOption("memory", "Memory"),
        makeColumnOption("storage", "Storage"),
        makeColumnOption("ebs-throughput", "EBS Throughput"),
        makeColumnOption("physical_processor", "Processor"),
        makeColumnOption("vcpus", "vCPUs"),
        makeColumnOption("networkperf", "Network Performance"),
        makeColumnOption("architecture", "Arch"),
        makeColumnOption("cost-ondemand-14", "PostgreSQL"),
        makeColumnOption("cost-reserved-14t", "PostgreSQL Reserved Cost"),
        makeColumnOption("cost-ondemand-2", "MySQL On Demand Cost"),
        makeColumnOption("cost-reserved-2", "MySQL Reserved Cost"),
        makeColumnOption(
            "cost-ondemand-10",
            "SQL Server Expresss On Demand Cost",
        ),
        makeColumnOption(
            "cost-reserved-10",
            "SQL Server Expresss Reserved Cost",
        ),
        makeColumnOption("cost-ondemand-11", "SQL Server Web On Demand Cost"),
        makeColumnOption("cost-reserved-11", "SQL Server Web Reserved Cost"),
        makeColumnOption(
            "cost-ondemand-12",
            "SQL Server Standard On Demand Cost",
        ),
        makeColumnOption(
            "cost-reserved-12",
            "SQL Server Standard Reserved Cost",
        ),
        makeColumnOption(
            "cost-ondemand-15",
            "SQL Server Enterprise On Demand Cost",
        ),
        makeColumnOption(
            "cost-reserved-15",
            "SQL Server Enterprise Reserved Cost",
        ),
        makeColumnOption(
            "cost-ondemand-21",
            "Aurora Postgres & MySQL On Demand Cost",
        ),
        makeColumnOption(
            "cost-reserved-21",
            "Aurora Postgres & MySQL Reserved Cost",
        ),
        makeColumnOption(
            "cost-ondemand-211",
            "Aurora I/O Optimized On Demand Cost",
        ),
        makeColumnOption("cost-ondemand-18", "MariaDB On Demand Cost"),
        makeColumnOption("cost-reserved-18", "MariaDB Reserved Cost"),
        makeColumnOption("cost-ondemand-5", "Oracle Enterprise On Demand Cost"),
        makeColumnOption("cost-reserved-5", "Oracle Enterprise Reserved Cost"),
        makeColumnOption(
            "ebs-baseline-bandwidth",
            "EBS Optimized: Baseline Bandwidth",
        ),
        makeColumnOption(
            "ebs-baseline-throughput",
            "EBS Optimized: Baseline Throughput (128K)",
        ),
        makeColumnOption(
            "ebs-baseline-iops",
            "EBS Optimized: Baseline IOPS (16K)",
        ),
        makeColumnOption("ebs-max-bandwidth", "EBS Optimized: Max Bandwidth"),
        makeColumnOption(
            "ebs-max-throughput",
            "EBS Optimized: Max Throughput (128K)",
        ),
        makeColumnOption("ebs-iops", "EBS Optimized: Max IOPS (16K)"),
    ] as const;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
): ColumnDef<EC2Instance>[] => [
    {
        header: "Name",
        id: "name",
        accessorKey: "pretty_name",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "pretty_name" }),
    },
    {
        header: "API Name",
        id: "apiname",
        accessorKey: "instance_type",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.instance_type;
            const valueB = rowB.original.instance_type;
            return sortByInstanceType(valueA, valueB, ".", "db.");
        },
        cell: (info) => {
            const value = info.getValue() as string;
            return (
                <RegionLinkPreloader
                    onClick={(e) => e.stopPropagation()}
                    href={`/aws/rds/${value}`}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
        filterFn: regex({ accessorKey: "instance_type" }),
    },
    {
        header: "Memory",
        id: "memory",
        accessorKey: "memory",
        filterFn: expr,
        sortingFn: "alphanumeric",
    },
    {
        header: "Storage",
        id: "storage",
        accessorKey: "storage",
        filterFn: expr,
        sortingFn: "alphanumeric",
    },
    {
        header: "EBS Throughput",
        id: "ebs-throughput",
        accessorKey: "ebs_throughput",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_throughput" }),
    },
    {
        header: "Processor",
        id: "physical_processor",
        accessorKey: "physicalProcessor",
        sortingFn: "alphanumeric",
        // @ts-expect-error: The typing is weird in the file
        filterFn: regex({ accessorKey: "physicalProcessor" }),
    },
    {
        header: "vCPUs",
        id: "vcpu",
        accessorKey: "vcpu",
        filterFn: expr,
        sortingFn: "alphanumeric",
    },
    {
        header: "Network Performance",
        id: "networkperf",
        accessorKey: "network_performance",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "network_performance" }),
    },
    {
        accessorKey: "arch",
        header: "Arch",
        size: 100,
        id: "architecture",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.arch;
            const valueB = rowB.original.arch;
            if (!valueA) return -1;
            if (!valueB) return 1;
            return JSON.stringify(
                typeof valueA === "string" ? [valueA] : valueA.sort(),
            ).localeCompare(
                JSON.stringify(
                    typeof valueB === "string" ? [valueB] : valueB.sort(),
                ),
            );
        },
        ...makeCellWithRegexSorter("arch", (info) => {
            const arch = info.getValue() as string[] | string;
            if (typeof arch === "string") return arch;
            if (!arch) return "";
            return arch.sort().join(", ");
        }),
    },
    {
        header: "PostgreSQL",
        id: "cost-ondemand-14",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["14"]?.ondemand,
        ),
    },
    {
        header: "PostgreSQL Reserved Cost",
        id: "cost-reserved-14t",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["14"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "MySQL On Demand Cost",
        id: "cost-ondemand-2",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["2"]?.ondemand,
        ),
    },
    {
        header: "MySQL Reserved Cost",
        id: "cost-reserved-2",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["2"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "SQL Server Expresss On Demand Cost",
        id: "cost-ondemand-10",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["10"]?.ondemand,
        ),
    },
    {
        header: "SQL Server Expresss Reserved Cost",
        id: "cost-reserved-10",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["10"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "SQL Server Web On Demand Cost",
        id: "cost-ondemand-11",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["11"]?.ondemand,
        ),
    },
    {
        header: "SQL Server Web Reserved Cost",
        id: "cost-reserved-11",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["11"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "SQL Server Standard On Demand Cost",
        id: "cost-ondemand-12",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["12"]?.ondemand,
        ),
    },
    {
        header: "SQL Server Standard Reserved Cost",
        id: "cost-reserved-12",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["12"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "SQL Server Enterprise On Demand Cost",
        id: "cost-ondemand-15",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["15"]?.ondemand,
        ),
    },
    {
        header: "SQL Server Enterprise Reserved Cost",
        id: "cost-reserved-15",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["15"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "Aurora Postgres & MySQL On Demand Cost",
        id: "cost-ondemand-21",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["21"]?.ondemand,
        ),
    },
    {
        header: "Aurora Postgres & MySQL Reserved Cost",
        id: "cost-reserved-21",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["21"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "Aurora I/O Optimized On Demand Cost",
        id: "cost-ondemand-211",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["211"]?.ondemand,
        ),
    },
    {
        header: "MariaDB On Demand Cost",
        id: "cost-ondemand-18",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["18"]?.ondemand,
        ),
    },
    {
        header: "MariaDB Reserved Cost",
        id: "cost-reserved-18",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["18"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "Oracle Enterprise On Demand Cost",
        id: "cost-ondemand-5",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["5"]?.ondemand,
        ),
    },
    {
        header: "Oracle Enterprise Reserved Cost",
        id: "cost-reserved-5",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["5"]?.reserved?.[reservedTerm],
        ),
    },
    {
        header: "EBS Optimized: Baseline Bandwidth",
        id: "ebs-baseline-bandwidth",
        accessorKey: "ebs_baseline_bandwidth",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_baseline_bandwidth" }),
    },
    {
        header: "EBS Optimized: Baseline Throughput (128K)",
        id: "ebs-baseline-throughput",
        accessorKey: "ebs_baseline_throughput",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_baseline_throughput" }),
    },
    {
        header: "EBS Optimized: Baseline IOPS (16K)",
        id: "ebs-baseline-iops",
        accessorKey: "ebs_baseline_iops",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_baseline_iops" }),
    },
    {
        header: "EBS Optimized: Max Bandwidth",
        id: "ebs-max-bandwidth",
        accessorKey: "ebs_max_bandwidth",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_max_bandwidth" }),
    },
    {
        header: "EBS Optimized: Max Throughput (128K)",
        id: "ebs-max-throughput",
        accessorKey: "ebs_throughput",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_throughput" }),
    },
    {
        header: "EBS Optimized: Max IOPS (16K)",
        id: "ebs-iops",
        accessorKey: "ebs_iops",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_iops" }),
    },
];
