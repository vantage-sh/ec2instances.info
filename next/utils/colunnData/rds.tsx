import { CostDuration, EC2Instance, PricingUnit } from "@/types";
import {
    regex,
    makeCellWithRegexSorter,
    expr,
    transformAllDataTables,
} from "./shared";
import { ColumnDef } from "@tanstack/react-table";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import { getPricingSorter, Locals } from "./ec2/columns";
import sortByInstanceType from "../sortByInstanceType";
import { prefixWithLocale } from "@/utils/locale";

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
        makeColumnOption("name", t?.("columns.common.name") ?? "Name"),
        makeColumnOption("apiname", t?.("columns.common.apiName") ?? "API Name"),
        makeColumnOption("compute_family", t?.("columns.common.computeFamily") ?? "Compute Family"),
        makeColumnOption("memory", t?.("columns.common.memory") ?? "Memory"),
        makeColumnOption("storage", t?.("columns.common.storage") ?? "Storage"),
        makeColumnOption("ebs-throughput", t?.("columns.rds.ebsThroughput") ?? "EBS Throughput"),
        makeColumnOption("physical_processor", t?.("columns.common.processor") ?? "Processor"),
        makeColumnOption("vcpus", t?.("columns.common.vCPUs") ?? "vCPUs"),
        makeColumnOption("networkperf", t?.("columns.common.networkPerformance") ?? "Network Performance"),
        makeColumnOption("architecture", t?.("columns.common.arch") ?? "Arch"),
        makeColumnOption("cost-ondemand-14", t?.("columns.rds.postgresql") ?? "PostgreSQL"),
        makeColumnOption("cost-reserved-14t", t?.("columns.rds.postgresqlReserved") ?? "PostgreSQL Reserved Cost"),
        makeColumnOption("cost-ondemand-2", t?.("columns.rds.mysqlOnDemand") ?? "MySQL On Demand Cost"),
        makeColumnOption("cost-reserved-2", t?.("columns.rds.mysqlReserved") ?? "MySQL Reserved Cost"),
        makeColumnOption("cost-ondemand-10", t?.("columns.rds.sqlExpressOnDemand") ?? "SQL Server Expresss On Demand Cost"),
        makeColumnOption("cost-reserved-10", t?.("columns.rds.sqlExpressReserved") ?? "SQL Server Expresss Reserved Cost"),
        makeColumnOption("cost-ondemand-11", t?.("columns.rds.sqlWebOnDemand") ?? "SQL Server Web On Demand Cost"),
        makeColumnOption("cost-reserved-11", t?.("columns.rds.sqlWebReserved") ?? "SQL Server Web Reserved Cost"),
        makeColumnOption("cost-ondemand-12", t?.("columns.rds.sqlStdOnDemand") ?? "SQL Server Standard On Demand Cost"),
        makeColumnOption("cost-reserved-12", t?.("columns.rds.sqlStdReserved") ?? "SQL Server Standard Reserved Cost"),
        makeColumnOption("cost-ondemand-15", t?.("columns.rds.sqlEntOnDemand") ?? "SQL Server Enterprise On Demand Cost"),
        makeColumnOption("cost-reserved-15", t?.("columns.rds.sqlEntReserved") ?? "SQL Server Enterprise Reserved Cost"),
        makeColumnOption("cost-ondemand-21", t?.("columns.rds.auroraOnDemand") ?? "Aurora Postgres & MySQL On Demand Cost"),
        makeColumnOption("cost-reserved-21", t?.("columns.rds.auroraReserved") ?? "Aurora Postgres & MySQL Reserved Cost"),
        makeColumnOption("cost-ondemand-211", t?.("columns.rds.auroraIoOnDemand") ?? "Aurora I/O Optimized On Demand Cost"),
        makeColumnOption("cost-ondemand-18", t?.("columns.rds.mariadbOnDemand") ?? "MariaDB On Demand Cost"),
        makeColumnOption("cost-reserved-18", t?.("columns.rds.mariadbReserved") ?? "MariaDB Reserved Cost"),
        makeColumnOption("cost-ondemand-5", t?.("columns.rds.oracleOnDemand") ?? "Oracle Enterprise BYOL On Demand Cost"),
        makeColumnOption("cost-reserved-5", t?.("columns.rds.oracleReserved") ?? "Oracle Enterprise BYOL Reserved Cost"),
        makeColumnOption("ebs-baseline-bandwidth", t?.("columns.ec2.ebsBaselineBandwidth") ?? "EBS Optimized: Baseline Bandwidth"),
        makeColumnOption("ebs-baseline-throughput", t?.("columns.ec2.ebsBaselineThroughput") ?? "EBS Optimized: Baseline Throughput (128K)"),
        makeColumnOption("ebs-baseline-iops", t?.("columns.ec2.ebsBaselineIops") ?? "EBS Optimized: Baseline IOPS (16K)"),
        makeColumnOption("ebs-max-bandwidth", t?.("columns.ec2.ebsMaxBandwidth") ?? "EBS Optimized: Max Bandwidth"),
        makeColumnOption("ebs-max-throughput", t?.("columns.ec2.ebsMaxThroughput") ?? "EBS Optimized: Max Throughput (128K)"),
        makeColumnOption("ebs-iops", t?.("columns.ec2.ebsMaxIops") ?? "EBS Optimized: Max IOPS (16K)"),
    ] as const;
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
        header: t?.("columns.common.name") ?? "Name",
        id: "name",
        accessorKey: "pretty_name",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "pretty_name" }),
    },
    {
        header: t?.("columns.common.apiName") ?? "API Name",
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
                    href={prefixWithLocale(`/aws/rds/${value}`, locale ?? "en")}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
        filterFn: regex({ accessorKey: "instance_type" }),
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
        header: t?.("columns.common.memory") ?? "Memory",
        id: "memory",
        accessorKey: "memory",
        filterFn: expr,
        sortingFn: "alphanumeric",
    },
    {
        header: t?.("columns.common.storage") ?? "Storage",
        id: "storage",
        accessorKey: "storage",
        filterFn: expr,
        sortingFn: "alphanumeric",
    },
    {
        header: t?.("columns.rds.ebsThroughput") ?? "EBS Throughput",
        id: "ebs-throughput",
        accessorKey: "ebs_throughput",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_throughput" }),
    },
    {
        header: t?.("columns.common.processor") ?? "Processor",
        id: "physical_processor",
        accessorKey: "physicalProcessor",
        sortingFn: "alphanumeric",
        // @ts-expect-error: The typing is weird in the file
        filterFn: regex({ accessorKey: "physicalProcessor" }),
    },
    {
        header: t?.("columns.common.vCPUs") ?? "vCPUs",
        id: "vcpu",
        accessorKey: "vcpu",
        filterFn: expr,
        sortingFn: "alphanumeric",
    },
    {
        header: t?.("columns.common.networkPerformance") ?? "Network Performance",
        id: "networkperf",
        accessorKey: "network_performance",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "network_performance" }),
    },
    {
        accessorKey: "arch",
        header: t?.("columns.common.arch") ?? "Arch",
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
        header: t?.("columns.rds.postgresql") ?? "PostgreSQL",
        id: "cost-ondemand-14",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["14"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.postgresqlReserved") ?? "PostgreSQL Reserved Cost",
        id: "cost-reserved-14t",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["14"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.mysqlOnDemand") ?? "MySQL On Demand Cost",
        id: "cost-ondemand-2",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["2"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.mysqlReserved") ?? "MySQL Reserved Cost",
        id: "cost-reserved-2",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["2"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlExpressOnDemand") ?? "SQL Server Expresss On Demand Cost",
        id: "cost-ondemand-10",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["10"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlExpressReserved") ?? "SQL Server Expresss Reserved Cost",
        id: "cost-reserved-10",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["10"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlWebOnDemand") ?? "SQL Server Web On Demand Cost",
        id: "cost-ondemand-11",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["11"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlWebReserved") ?? "SQL Server Web Reserved Cost",
        id: "cost-reserved-11",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["11"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlStdOnDemand") ?? "SQL Server Standard On Demand Cost",
        id: "cost-ondemand-12",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["12"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlStdReserved") ?? "SQL Server Standard Reserved Cost",
        id: "cost-reserved-12",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["12"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlEntOnDemand") ?? "SQL Server Enterprise On Demand Cost",
        id: "cost-ondemand-15",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["15"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.sqlEntReserved") ?? "SQL Server Enterprise Reserved Cost",
        id: "cost-reserved-15",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["15"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.auroraOnDemand") ?? "Aurora Postgres & MySQL On Demand Cost",
        id: "cost-ondemand-21",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["21"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.auroraReserved") ?? "Aurora Postgres & MySQL Reserved Cost",
        id: "cost-reserved-21",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["21"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.auroraIoOnDemand") ?? "Aurora I/O Optimized On Demand Cost",
        id: "cost-ondemand-211",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["211"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.mariadbOnDemand") ?? "MariaDB On Demand Cost",
        id: "cost-ondemand-18",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["18"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.mariadbReserved") ?? "MariaDB Reserved Cost",
        id: "cost-reserved-18",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["18"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.oracleOnDemand") ?? "Oracle Enterprise On Demand Cost",
        id: "cost-ondemand-5",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["5"]?.ondemand,
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.rds.oracleReserved") ?? "Oracle Enterprise Reserved Cost",
        id: "cost-reserved-5",
        accessorKey: "pricing",
        ...getPricingSorter(
            selectedRegion,
            pricingUnit,
            costDuration,
            (pricing) => pricing?.["5"]?.reserved?.[reservedTerm],
            true,
            currency,
        ),
    },
    {
        header: t?.("columns.ec2.ebsBaselineBandwidth") ?? "EBS Optimized: Baseline Bandwidth",
        id: "ebs-baseline-bandwidth",
        accessorKey: "ebs_baseline_bandwidth",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_baseline_bandwidth" }),
    },
    {
        header: t?.("columns.ec2.ebsBaselineThroughput") ?? "EBS Optimized: Baseline Throughput (128K)",
        id: "ebs-baseline-throughput",
        accessorKey: "ebs_baseline_throughput",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_baseline_throughput" }),
    },
    {
        header: t?.("columns.ec2.ebsBaselineIops") ?? "EBS Optimized: Baseline IOPS (16K)",
        id: "ebs-baseline-iops",
        accessorKey: "ebs_baseline_iops",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_baseline_iops" }),
    },
    {
        header: t?.("columns.ec2.ebsMaxBandwidth") ?? "EBS Optimized: Max Bandwidth",
        id: "ebs-max-bandwidth",
        accessorKey: "ebs_max_bandwidth",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_max_bandwidth" }),
    },
    {
        header: t?.("columns.ec2.ebsMaxThroughput") ?? "EBS Optimized: Max Throughput (128K)",
        id: "ebs-max-throughput",
        accessorKey: "ebs_throughput",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_throughput" }),
    },
    {
        header: t?.("columns.ec2.ebsMaxIops") ?? "EBS Optimized: Max IOPS (16K)",
        id: "ebs-iops",
        accessorKey: "ebs_iops",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "ebs_iops" }),
    },
];
};
