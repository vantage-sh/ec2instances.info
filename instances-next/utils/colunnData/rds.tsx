import { CostDuration, EC2Instance, Pricing, PricingUnit } from "@/types";
import { makeSchemaWithDefaults, doAllDataTablesMigrations, gt } from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { calculateCost, calculateAndFormatCost } from "./ec2/columns";

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
    return doAllDataTablesMigrations("/rds", initialColumnsArr, initialColumnsValue);
}

export function makePrettyNames<V>(makeColumnOption: (key: keyof typeof initialColumnsValue, label: string) => V) {
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
        makeColumnOption("cost-ondemand-10", "SQL Server Expresss On Demand Cost"),
        makeColumnOption("cost-reserved-10", "SQL Server Expresss Reserved Cost"),
        makeColumnOption("cost-ondemand-11", "SQL Server Web On Demand Cost"),
        makeColumnOption("cost-reserved-11", "SQL Server Web Reserved Cost"),
        makeColumnOption("cost-ondemand-12", "SQL Server Standard On Demand Cost"),
        makeColumnOption("cost-reserved-12", "SQL Server Standard Reserved Cost"),
        makeColumnOption("cost-ondemand-15", "SQL Server Enterprise On Demand Cost"),
        makeColumnOption("cost-reserved-15", "SQL Server Enterprise Reserved Cost"),
        makeColumnOption("cost-ondemand-21", "Aurora Postgres & MySQL On Demand Cost"),
        makeColumnOption("cost-reserved-21", "Aurora Postgres & MySQL Reserved Cost"),
        makeColumnOption("cost-ondemand-211", "Aurora I/O Optimized On Demand Cost"),
        makeColumnOption("cost-ondemand-18", "MariaDB On Demand Cost"),
        makeColumnOption("cost-reserved-18", "MariaDB Reserved Cost"),
        makeColumnOption("cost-ondemand-5", "Oracle Enterprise On Demand Cost"),
        makeColumnOption("cost-reserved-5", "Oracle Enterprise Reserved Cost"),
        makeColumnOption("ebs-baseline-bandwidth", "EBS Optimized: Baseline Bandwidth"),
        makeColumnOption("ebs-baseline-throughput", "EBS Optimized: Baseline Throughput (128K)"),
        makeColumnOption("ebs-baseline-iops", "EBS Optimized: Baseline IOPS (16K)"),
        makeColumnOption("ebs-max-bandwidth", "EBS Optimized: Max Bandwidth"),
        makeColumnOption("ebs-max-throughput", "EBS Optimized: Max Throughput (128K)"),
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
    },
    {
        header: "API Name",
        id: "apiname",
        accessorKey: "instance_type",
        sortingFn: "alphanumeric",
        cell: (info) => {
            const value = info.getValue() as string;
            return <Link onClick={(e) => e.stopPropagation()} href={`/aws/rds/${value}`}>{value}</Link>;
        },
    },
    {
        header: "Memory",
        id: "memory",
        accessorKey: "memory",
        filterFn: gt,
        sortingFn: "alphanumeric",
    },
    {
        header: "Storage",
        id: "storage",
        accessorKey: "storage",
        filterFn: gt,
        sortingFn: "alphanumeric",
    },
    {
        header: "EBS Throughput",
        id: "ebs-throughput",
        accessorKey: "ebs_throughput",
        sortingFn: "alphanumeric",
    },
    {
        header: "Processor",
        id: "physical_processor",
        accessorKey: "physicalProcessor",
        sortingFn: "alphanumeric",
    },
    {
        header: "vCPUs",
        id: "vcpu",
        accessorKey: "vcpu",
        filterFn: gt,
        sortingFn: "alphanumeric",
    },
    {
        header: "Network Performance",
        id: "networkperf",
        accessorKey: "network_performance",
        sortingFn: "alphanumeric",
    },
    {
        accessorKey: "arch",
        header: "Architecture",
        id: "architecture",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.arch;
            const valueB = rowB.original.arch;
            if (!valueA) return -1;
            if (!valueB) return 1;
            const a = valueA.includes("i386") ? "32/64-bit" : "64-bit";
            const b = valueB.includes("i386") ? "32/64-bit" : "64-bit";
            return a.localeCompare(b);
        },
        cell: (info) => {
            const arch = info.getValue() as string[];
            if (!arch) return "unknown";
            return arch.includes("i386") ? "32/64-bit" : "64-bit";
        },
    },
    {
        header: "PostgreSQL",
        id: "cost-ondemand-14",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["14"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["14"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["14"]?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        },
    },
    {
        header: "PostgreSQL Reserved Cost",
        id: "cost-reserved-14t",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["14"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["14"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["14"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "MySQL On Demand Cost",
        id: "cost-ondemand-2",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["2"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["2"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["2"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "MySQL Reserved Cost",
        id: "cost-reserved-2",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["2"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["2"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["2"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Expresss On Demand Cost",
        id: "cost-ondemand-10",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["10"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["10"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["10"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Expresss Reserved Cost",
        id: "cost-reserved-10",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["10"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["10"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["10"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Web On Demand Cost",
        id: "cost-ondemand-11",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["11"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["11"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["11"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Web Reserved Cost",
        id: "cost-reserved-11",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["11"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["11"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["11"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Standard On Demand Cost",
        id: "cost-ondemand-12",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["12"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["12"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["12"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Standard Reserved Cost",
        id: "cost-reserved-12",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["12"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["12"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["12"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Enterprise On Demand Cost",
        id: "cost-ondemand-15",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["15"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["15"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["15"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "SQL Server Enterprise Reserved Cost",
        id: "cost-reserved-15",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["15"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["15"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["15"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "Aurora Postgres & MySQL On Demand Cost",
        id: "cost-ondemand-21",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["21"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["21"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["21"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "Aurora Postgres & MySQL Reserved Cost",
        id: "cost-reserved-21",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["21"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["21"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["21"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "Aurora I/O Optimized On Demand Cost",
        id: "cost-ondemand-211",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["211"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["211"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["211"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "MariaDB On Demand Cost",
        id: "cost-ondemand-18",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["18"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["18"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["18"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "MariaDB Reserved Cost",
        id: "cost-reserved-18",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["18"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["18"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["18"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "Oracle Enterprise On Demand Cost",
        id: "cost-ondemand-5",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["5"]?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["5"]?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["5"]?.ondemand;
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "Oracle Enterprise Reserved Cost",
        id: "cost-reserved-5",
        accessorKey: "pricing",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.["5"]?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.["5"]?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        cell: (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.["5"]?.reserved?.[reservedTerm];
            return calculateAndFormatCost(price, info.row.original, pricingUnit, costDuration);
        },
    },
    {
        header: "EBS Optimized: Baseline Bandwidth",
        id: "ebs-baseline-bandwidth",
        accessorKey: "ebs_baseline_bandwidth",
        sortingFn: "alphanumeric",
    },
    {
        header: "EBS Optimized: Baseline Throughput (128K)",
        id: "ebs-baseline-throughput",
        accessorKey: "ebs_baseline_throughput",
        sortingFn: "alphanumeric",
    },
    {
        header: "EBS Optimized: Baseline IOPS (16K)",
        id: "ebs-baseline-iops",
        accessorKey: "ebs_baseline_iops",
        sortingFn: "alphanumeric",
    },
    {
        header: "EBS Optimized: Max Bandwidth",
        id: "ebs-max-bandwidth",
        accessorKey: "ebs_max_bandwidth",
        sortingFn: "alphanumeric",
    },
    {
        header: "EBS Optimized: Max Throughput (128K)",
        id: "ebs-max-throughput",
        accessorKey: "ebs_throughput",
        sortingFn: "alphanumeric",
    },
    {
        header: "EBS Optimized: Max IOPS (16K)",
        id: "ebs-iops",
        accessorKey: "ebs_iops",
        sortingFn: "alphanumeric",
    },
];
