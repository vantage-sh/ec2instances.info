"use client";

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    ColumnDef,
    flexRender,
    Row,
} from "@tanstack/react-table";
import { Instance } from "@/types";
import {
    columnVisibilityAtom,
    useSearchTerm,
    useSelectedRegion,
    useReservedTerm,
    useHookToExportButton,
    useGSettings,
} from "@/state";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";

interface InstanceTableProps {
    instances: Instance[];
}

interface Storage {
    devices: number;
    size: number;
    size_unit: string;
    nvme_ssd: boolean;
    ssd: boolean;
}

function csvEscape(input: string) {
    // Check if the input contains special characters or double quotes
    if (/[",\n]/.test(input)) {
        // If it does, wrap the input in double quotes and escape existing double quotes
        return `"${input.replace(/"/g, '""')}"`;
    } else {
        // If no special characters are present, return the input as is
        return input;
    }
}

export default function InstanceTable({ instances }: InstanceTableProps) {
    const columnVisibility = columnVisibilityAtom.use();
    const [searchTerm] = useSearchTerm();
    const [selectedRegion] = useSelectedRegion();
    const [reservedTerm] = useReservedTerm();
    const [gSettings, gSettingsFullMutations] = useGSettings();

    const columns: ColumnDef<Instance>[] = [
        {
            accessorKey: "pretty_name",
            header: "Name",
            id: "pretty_name",
            cell: (info) => info.getValue() as string,
        },
        {
            accessorKey: "instance_type",
            header: "API Name",
            id: "instance_type",
            cell: (info) => {
                const value = info.getValue() as string;
                return <a href={`/aws/ec2/${value}`}>{value}</a>;
            },
        },
        {
            accessorKey: "instance_type",
            header: "Instance Family",
            id: "family",
            cell: (info) => (info.getValue() as string).split(".")[0],
        },
        {
            accessorKey: "memory",
            header: "Instance Memory",
            id: "memory",
            cell: (info) => `${info.getValue() as number} GiB`,
        },
        {
            accessorKey: "ECU",
            header: "Compute Units (ECU)",
            id: "ECU",
            cell: (info) => {
                const value = info.getValue();
                if (value === "variable") {
                    const basePerformance = info.row.original.base_performance;
                    if (basePerformance) {
                        return (
                            <span>
                                <abbr title="For T2 instances, the 100% unit represents a High Frequency Intel Xeon Processors with Turbo up to 3.3GHz.">
                                    <a
                                        href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html"
                                        target="_blank"
                                    >
                                        Base performance:{" "}
                                        {`${(basePerformance * 100).toFixed(1)}%`}
                                    </a>
                                </abbr>
                            </span>
                        );
                    }
                    return (
                        <span>
                            <a
                                href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts_micro_instances.html"
                                target="_blank"
                            >
                                Burstable
                            </a>
                        </span>
                    );
                }
                return `${value} units`;
            },
        },
        {
            accessorKey: "vCPU",
            header: "vCPUs",
            id: "vCPU",
            cell: (info) => {
                const value = info.getValue() as number;
                const burstMinutes = info.row.original.burst_minutes;
                if (burstMinutes) {
                    const hours = Math.floor(burstMinutes / 60);
                    const minutes = burstMinutes % 60;
                    return (
                        <span>
                            {value} vCPUs
                            <abbr title="Given that a CPU Credit represents the performance of a full CPU core for one minute, the maximum credit balance is converted to CPU burst minutes per day by dividing it by the number of vCPUs.">
                                <a
                                    href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html"
                                    target="_blank"
                                >
                                    for a {hours}h {minutes}m burst
                                </a>
                            </abbr>
                        </span>
                    );
                }
                return `${value} vCPUs`;
            },
        },
        {
            accessorKey: "memory_per_vcpu",
            header: "GiB of Memory per vCPU",
            id: "memory_per_vcpu",
            cell: (info) => {
                const value = info.getValue();
                if (value === "unknown") return "unknown";
                return `${Number(value).toFixed(2)} GiB/vCPU`;
            },
        },
        {
            accessorKey: "GPU",
            header: "GPUs",
            id: "GPU",
            cell: (info) => info.getValue() as number,
        },
        {
            accessorKey: "GPU_model",
            header: "GPU model",
            id: "GPU_model",
            cell: (info) => info.getValue() as string,
        },
        {
            accessorKey: "GPU_memory",
            header: "GPU memory",
            id: "GPU_memory",
            cell: (info) => `${info.getValue() as number} GiB`,
        },
        {
            accessorKey: "compute_capability",
            header: "CUDA Compute Capability",
            id: "compute_capability",
            cell: (info) => info.getValue() as string,
        },
        {
            accessorKey: "FPGA",
            header: "FPGAs",
            id: "FPGA",
            cell: (info) => info.getValue() as number,
        },
        {
            accessorKey: "ECU_per_vcpu",
            header: "ECU per vCPU",
            id: "ECU_per_vcpu",
            cell: (info) => {
                const value = info.getValue();
                if (value === "variable" || value === "unknown") {
                    return (
                        <span>
                            <a
                                href="http://aws.amazon.com/ec2/instance-types/#burst"
                                target="_blank"
                            >
                                {value === "variable" ? "Burstable" : "unknown"}
                            </a>
                        </span>
                    );
                }
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    return "unknown";
                }
                return `${numValue.toFixed(4)} units`;
            },
        },
        {
            accessorKey: "physical_processor",
            header: "Physical Processor",
            id: "physical_processor",
            cell: (info) => info.getValue() || "unknown",
        },
        {
            accessorKey: "clock_speed_ghz",
            header: "Clock Speed(GHz)",
            id: "clock_speed_ghz",
            cell: (info) => info.getValue() || "unknown",
        },
        {
            accessorKey: "intel_avx",
            header: "Intel AVX",
            id: "intel_avx",
            cell: (info) => (info.getValue() ? "Yes" : "unknown"),
        },
        {
            accessorKey: "intel_avx2",
            header: "Intel AVX2",
            id: "intel_avx2",
            cell: (info) => (info.getValue() ? "Yes" : "unknown"),
        },
        {
            accessorKey: "intel_avx512",
            header: "Intel AVX-512",
            id: "intel_avx512",
            cell: (info) => (info.getValue() ? "Yes" : "unknown"),
        },
        {
            accessorKey: "intel_turbo",
            header: "Intel Turbo",
            id: "intel_turbo",
            cell: (info) => (info.getValue() ? "Yes" : "unknown"),
        },
        {
            accessorKey: "storage",
            header: "Instance Storage",
            id: "storage",
            cell: (info) => {
                const storage = info.getValue() as Storage;
                if (!storage) return "EBS only";
                const totalSize = storage.devices * storage.size;
                const storageType = `${storage.nvme_ssd ? "NVMe " : ""}${storage.ssd ? "SSD" : "HDD"}`;
                if (storage.devices > 1) {
                    return `${totalSize} ${storage.size_unit} (${storage.devices} * ${storage.size} ${storage.size_unit} ${storageType})`;
                }
                return `${totalSize} ${storage.size_unit} ${storageType}`;
            },
        },
        {
            accessorKey: "storage",
            header: "Instance Storage: already warmed-up",
            id: "warmed-up",
            cell: (info) => {
                const storage = info.getValue() as Storage;
                if (!storage) return "N/A";
                return "N/A";
            },
        },
        {
            accessorKey: "storage",
            header: "Instance Storage: SSD TRIM Support",
            id: "trim-support",
            cell: (info) => {
                const storage = info.getValue() as Storage;
                if (!storage || !storage.ssd) return "N/A";
                return "N/A";
            },
        },
        {
            accessorKey: "arch",
            header: "Arch",
            id: "arch",
            cell: (info) => {
                const arch = info.getValue() as string[];
                return arch.includes("i386") ? "32/64-bit" : "64-bit";
            },
        },
        {
            accessorKey: "network_performance",
            header: "Network Performance",
            id: "network_performance",
            cell: (info) => info.getValue() as string,
        },
        {
            accessorKey: "ebs_baseline_bandwidth",
            header: "EBS Optimized: Baseline Bandwidth",
            id: "ebs_baseline_bandwidth",
            cell: (info) => {
                const value = info.getValue();
                if (!value) return "N/A";
                return `${value} Mbps`;
            },
        },
        {
            accessorKey: "ebs_baseline_throughput",
            header: "EBS Optimized: Baseline Throughput (128K)",
            id: "ebs_baseline_throughput",
            cell: (info) => `${info.getValue() as number} MB/s`,
        },
        {
            accessorKey: "ebs_baseline_iops",
            header: "EBS Optimized: Baseline IOPS (16K)",
            id: "ebs_baseline_iops",
            cell: (info) => `${info.getValue() as number} IOPS`,
        },
        {
            accessorKey: "ebs_max_bandwidth",
            header: "EBS Optimized: Max Bandwidth",
            id: "ebs_max_bandwidth",
            cell: (info) => {
                const value = info.getValue();
                if (!value) return "N/A";
                return `${value} Mbps`;
            },
        },
        {
            accessorKey: "ebs_throughput",
            header: "EBS Optimized: Max Throughput (128K)",
            id: "ebs_throughput",
            cell: (info) => `${info.getValue() as number} MB/s`,
        },
        {
            accessorKey: "ebs_iops",
            header: "EBS Optimized: Max IOPS (16K)",
            id: "ebs_iops",
            cell: (info) => `${info.getValue() as number} IOPS`,
        },
        {
            accessorKey: "ebs_as_nvme",
            header: "EBS Exposed as NVMe",
            id: "ebs_as_nvme",
            cell: (info) => (info.getValue() ? "Yes" : "No"),
        },
        {
            accessorKey: "vpc",
            header: "Max IPs",
            id: "maxips",
            cell: (info) => {
                const vpc = info.getValue() as any;
                if (!vpc) return "N/A";
                const maxIps = vpc.max_enis * vpc.ips_per_eni;
                return maxIps;
            },
        },
        {
            accessorKey: "vpc",
            header: "Max ENIs",
            id: "maxenis",
            cell: (info) => {
                const vpc = info.getValue() as any;
                if (!vpc) return "N/A";
                return vpc.max_enis;
            },
        },
        {
            accessorKey: "enhanced_networking",
            header: "Enhanced Networking",
            id: "enhanced_networking",
            cell: (info) => (info.getValue() ? "Yes" : "No"),
        },
        {
            accessorKey: "vpc_only",
            header: "VPC Only",
            id: "vpc_only",
            cell: (info) => (info.getValue() ? "Yes" : "No"),
        },
        {
            accessorKey: "ipv6_support",
            header: "IPv6 Support",
            id: "ipv6_support",
            cell: (info) => (info.getValue() ? "Yes" : "No"),
        },
        {
            accessorKey: "placement_group_support",
            header: "Placement Group Support",
            id: "placement_group_support",
            cell: (info) => (info.getValue() ? "Yes" : "No"),
        },
        {
            accessorKey: "linux_virtualization_types",
            header: "Linux Virtualization",
            id: "linux_virtualization_types",
            cell: (info) => {
                const types = info.getValue() as string[];
                return types?.length ? types.join(", ") : "Unknown";
            },
        },
        {
            accessorKey: "emr",
            header: "On EMR",
            id: "emr",
            cell: (info) => (info.getValue() ? "Yes" : "No"),
        },
        {
            accessorKey: "availability_zones",
            header: "Availability Zones",
            id: "availability_zones",
            cell: (info) => {
                const zones = info.getValue() as Record<string, string[]>;
                return zones?.["us-east-1"]?.join(", ") || "";
            },
        },
        {
            accessorKey: "pricing",
            header: "On Demand",
            id: "cost-ondemand",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.linux?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux Reserved cost",
            id: "cost-reserved",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.linux?.reserved?.[reservedTerm];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux Spot Minimum cost",
            id: "cost-spot-min",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.linux?.spot_min;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux Spot Average cost",
            id: "cost-spot-max",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.linux?.spot_avg;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "RHEL On Demand cost",
            id: "cost-ondemand-rhel",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.rhel?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "RHEL Reserved cost",
            id: "cost-reserved-rhel",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.rhel?.reserved?.[reservedTerm];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "RHEL Spot Minimum cost",
            id: "cost-spot-min-rhel",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.rhel?.spot_min;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "RHEL Spot Maximum cost",
            id: "cost-spot-max-rhel",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.rhel?.spot_max;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "SLES On Demand cost",
            id: "cost-ondemand-sles",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.sles?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "SLES Reserved cost",
            id: "cost-reserved-sles",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.sles?.reserved?.[reservedTerm];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "SLES Spot Minimum cost",
            id: "cost-spot-min-sles",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.sles?.spot_min;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "SLES Spot Maximum cost",
            id: "cost-spot-max-sles",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.sles?.spot_max;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows On Demand cost",
            id: "cost-ondemand-mswin",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.mswin?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows Reserved cost",
            id: "cost-reserved-mswin",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.mswin?.reserved?.[reservedTerm];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows Spot Minimum cost",
            id: "cost-spot-min-mswin",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.mswin?.spot_min;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows Spot Average cost",
            id: "cost-spot-max-mswin",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.mswin?.spot_avg;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Dedicated Host On Demand",
            id: "cost-ondemand-dedicated",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.dedicated?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Dedicated Host Reserved",
            id: "cost-reserved-dedicated",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.dedicated?.reserved?.[
                        reservedTerm
                    ];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows SQL Web On Demand cost",
            id: "cost-ondemand-mswinSQLWeb",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.mswinSQLWeb?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows SQL Web Reserved cost",
            id: "cost-reserved-mswinSQLWeb",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.mswinSQLWeb?.reserved?.[
                        reservedTerm
                    ];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows SQL Std On Demand cost",
            id: "cost-ondemand-mswinSQL",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.mswinSQL?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows SQL Std Reserved cost",
            id: "cost-reserved-mswinSQL",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.mswinSQL?.reserved?.[
                        reservedTerm
                    ];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows SQL Ent On Demand cost",
            id: "cost-ondemand-mswinSQLEnterprise",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.mswinSQLEnterprise?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Windows SQL Ent Reserved cost",
            id: "cost-reserved-mswinSQLEnterprise",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.mswinSQLEnterprise?.reserved?.[
                        reservedTerm
                    ];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux SQL Web On Demand cost",
            id: "cost-ondemand-linuxSQLWeb",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.linuxSQLWeb?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux SQL Web Reserved cost",
            id: "cost-reserved-linuxSQLWeb",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.linuxSQLWeb?.reserved?.[
                        reservedTerm
                    ];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux SQL Std On Demand cost",
            id: "cost-ondemand-linuxSQL",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.linuxSQL?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux SQL Std Reserved cost",
            id: "cost-reserved-linuxSQL",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.linuxSQL?.reserved?.[
                        reservedTerm
                    ];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux SQL Ent On Demand cost",
            id: "cost-ondemand-linuxSQLEnterprise",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.linuxSQLEnterprise?.ondemand;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux SQL Ent Reserved cost",
            id: "cost-reserved-linuxSQLEnterprise",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price =
                    pricing?.[selectedRegion]?.linuxSQLEnterprise?.reserved?.[
                        reservedTerm
                    ];
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "pricing",
            header: "Linux Spot Interrupt Frequency",
            id: "spot-interrupt-rate",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const pctInterrupt =
                    pricing?.[selectedRegion]?.linux?.pct_interrupt;
                if (pctInterrupt === "N/A") return "unavailable";
                return pctInterrupt;
            },
        },
        {
            accessorKey: "pricing",
            header: "EMR cost",
            id: "cost-emr",
            cell: (info) => {
                const pricing = info.getValue() as Record<string, any>;
                const price = pricing?.[selectedRegion]?.emr?.emr;
                return price
                    ? `$${Number(price).toFixed(4)} hourly`
                    : "unavailable";
            },
        },
        {
            accessorKey: "generation",
            header: "Generation",
            id: "generation",
            cell: (info) => info.getValue() as string,
        },
    ];

    const table = useReactTable({
        data: instances,
        columns,
        state: {
            columnVisibility,
            globalFilter: searchTerm,
        },
        enableFilters: true,
        enableMultiRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    useHookToExportButton(() => {
        let csv = "";
        for (const header of table.getHeaderGroups()) {
            csv +=
                header.headers
                    .map((h) =>
                        csvEscape(
                            h.getContext().column.columnDef.header as string,
                        ),
                    )
                    .join(",") + "\n";
        }
        for (const row of table.getRowModel().rows) {
            csv +=
                row
                    .getVisibleCells()
                    .map((c) => csvEscape(String(c.getContext().getValue())))
                    .join(",") + "\n";
        }
        if (typeof window !== "undefined") {
            const filename = `${document.title}.csv`;
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
        }
    });

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);

    const { rows } = table.getRowModel();
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 35,
        overscan: 10,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalHeight = rowVirtualizer.getTotalSize();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom =
        virtualRows.length > 0
            ? totalHeight - virtualRows[virtualRows.length - 1].end
            : 0;

    useEffect(() => {
        if (!gSettings) return;
        const selectedInstances = gSettings.selected;
        for (const row of rows) {
            row.toggleSelected(selectedInstances.includes(row.original.instance_type));
        }
    }, [gSettingsFullMutations, rows]);

    const handleRow = useCallback(
        (row: Row<Instance>) => {
            if (!gSettings) return;
            row.toggleSelected();
            const selectedInstances = gSettings.selected;
            if (selectedInstances.includes(row.original.instance_type)) {
                selectedInstances.splice(
                    selectedInstances.indexOf(row.original.instance_type),
                    1,
                );
            } else {
                selectedInstances.push(row.original.instance_type);
            }
            gSettings.selected = selectedInstances;
        },
        [gSettingsFullMutations],
    );

    return (
        <div className="w-full h-full">
            <div ref={tableContainerRef} className="h-full overflow-auto">
                <table className="w-full table-fixed">
                    <colgroup>
                        {table.getVisibleLeafColumns().map((column) => (
                            <col
                                key={column.id}
                                style={{ width: `${column.getSize()}px` }}
                            />
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-gray-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                    </th>
                                ))}
                                <th></th>
                            </tr>
                        ))}
                    </thead>
                    <tbody ref={tableBodyRef}>
                        {paddingTop > 0 && (
                            <tr>
                                <td
                                    style={{ height: `${paddingTop}px` }}
                                    colSpan={
                                        table.getVisibleLeafColumns().length
                                    }
                                />
                            </tr>
                        )}
                        {virtualRows.map((virtualRow) => {
                            const row = rows[virtualRow.index];
                            return (
                                <tr
                                    onClick={() => handleRow(row)}
                                    key={row.id}
                                    className={`border-b border-gray-200 ${row.getIsSelected() ? "bg-purple-50" : ""}`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="py-1 whitespace-nowrap overflow-hidden text-ellipsis"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </td>
                                    ))}
                                    <td>
                                        {/** DO NOT REMOVE! This is essential for blind people to select rows */}
                                        <form
                                            onSubmit={(e) => e.preventDefault()}
                                        >
                                            <label
                                                htmlFor={`${row.id}-checkbox`}
                                                className="sr-only"
                                            >
                                                Toggle row
                                            </label>
                                            <input
                                                type="checkbox"
                                                id={`${row.id}-checkbox`}
                                                className="sr-only"
                                                checked={row.getIsSelected()}
                                                onChange={(e) => {
                                                    e.preventDefault();
                                                    handleRow(row);
                                                }}
                                            />
                                        </form>
                                    </td>
                                </tr>
                            );
                        })}
                        {paddingBottom > 0 && (
                            <tr>
                                <td
                                    style={{ height: `${paddingBottom}px` }}
                                    colSpan={
                                        table.getVisibleLeafColumns().length
                                    }
                                />
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
