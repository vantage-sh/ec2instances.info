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
    ["ebs-throughput", true],
    ["physical_processor", true],
    ["vcpus", true],
    ["networkperf", true],
    ["architecture", true],
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
    ["ebs-baseline-bandwidth", true],
    ["ebs-baseline-throughput", true],
    ["ebs-baseline-iops", true],
    ["ebs-max-bandwidth", true],
    ["ebs-max-throughput", true],
    ["ebs-iops", true],
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
        accessorKey: "physical_processor",
        sortingFn: "alphanumeric",
    },
    {
        header: "vCPUs",
        id: "vcpu",
        accessorKey: "vCPU",
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
];
