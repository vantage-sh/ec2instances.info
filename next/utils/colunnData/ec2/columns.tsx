import { CostDuration, EC2Instance, Pricing, PricingUnit } from "@/types";
import { ColumnDef, Row } from "@tanstack/react-table";
import RegionLinkPreloader from "@/components/RegionLinkPreloader";
import { ClockFadingIcon } from "lucide-react";
import sortByInstanceType from "@/utils/sortByInstanceType";
import { regex, makeCellWithRegexSorter } from "../shared";

interface Storage {
    devices: number;
    size: number;
    size_unit: string;
    nvme_ssd: boolean;
    ssd: boolean;
    trim_support: boolean;
    storage_needs_initialization: boolean;
}

function gt(row: Row<EC2Instance>, columnId: string, filterValue: number) {
    const value = row.original[columnId as keyof EC2Instance];
    if (typeof value !== "number") return false;
    return value >= filterValue;
}

export function calculateCost(
    price: string | undefined,
    instance: EC2Instance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
): number {
    if (!price) return -1;

    const hourMultipliers = {
        secondly: 1 / (60 * 60),
        minutely: 1 / 60,
        hourly: 1,
        daily: 24,
        weekly: 7 * 24,
        monthly: (365 * 24) / 12,
        annually: 365 * 24,
    };

    const durationMultiplier = hourMultipliers[costDuration];
    let pricingUnitModifier = 1;

    if (pricingUnit !== "instance") {
        pricingUnitModifier = instance[
            pricingUnit === "vcpu"
                ? "vCPU"
                : pricingUnit === "ecu"
                  ? "ECU"
                  : "memory"
        ] as number;
    }

    return (Number(price) * durationMultiplier) / pricingUnitModifier;
}

const FLOAT = /\d*\.?\d+/g;

export function calculateAndFormatCost(
    price: string | undefined,
    instance: EC2Instance,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
): string {
    const perTime = calculateCost(price, instance, pricingUnit, costDuration);
    if (perTime === -1) return "unavailable";

    const precision =
        costDuration === "secondly" || costDuration === "minutely" ? 6 : 4;

    const measuringUnits = {
        instances: "",
        vcpu: "vCPU",
        ecu: "ECU",
        memory: "GiB",
    };

    let durationText: string = costDuration;
    if (costDuration === "secondly") durationText = "per sec";
    if (costDuration === "minutely") durationText = "per min";

    const pricingMeasuringUnits =
        pricingUnit === "instance"
            ? ` ${durationText}`
            : ` ${durationText} / ${measuringUnits[pricingUnit]}`;

    return `$${perTime.toFixed(precision)}${pricingMeasuringUnits}`;
}

export const columnsGen = (
    selectedRegion: string,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    reservedTerm: string,
): ColumnDef<EC2Instance>[] => [
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
        size: 175,
        id: "instance_type",
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
                    href={`/aws/ec2/${value}`}
                >
                    {value}
                </RegionLinkPreloader>
            );
        },
    },
    {
        accessorKey: "instance_type",
        header: "Instance Family",
        size: 150,
        id: "family",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter(
            "instance_type",
            (info) => (info.getValue() as string).split(".")[0],
        ),
    },
    {
        accessorKey: "memory",
        header: "Instance Memory",
        size: 170,
        id: "memory",
        sortingFn: "alphanumeric",
        filterFn: gt,
        cell: (info) => `${info.getValue() as number} GiB`,
    },
    {
        accessorKey: "ECU",
        header: "Compute Units (ECU)",
        size: 180,
        id: "ECU",
        sortingFn: "alphanumeric",
        filterFn: regex({
            accessorKey: "ECU",
        }),
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
        size: 110,
        id: "vCPU",
        filterFn: gt,
        cell: (info) => {
            const value = info.getValue() as number;
            const burstMinutes = info.row.original.burst_minutes;
            if (burstMinutes) {
                const hours = Math.floor(burstMinutes / 60);
                const minutes = burstMinutes % 60;
                return (
                    <span className="block @container">
                        {value} vCPUs{" "}
                        <abbr
                            className="hidden @[150px]:inline-block"
                            title="Given that a CPU Credit represents the performance of a full CPU core for one minute, the maximum credit balance is converted to CPU burst minutes per day by dividing it by the number of vCPUs."
                        >
                            (
                            <a
                                href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html"
                                target="_blank"
                            >
                                {hours}h {minutes}m burst
                            </a>
                            )
                        </abbr>
                        <abbr
                            className="visible @[150px]:hidden"
                            title={`For a ${hours}h ${minutes}m burst`}
                        >
                            <ClockFadingIcon className="inline-block w-3 h-3 stroke-purple-1" />
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
        filterFn: gt,
        cell: (info) => {
            const value = info.getValue();
            if (value === "unknown") return "unknown";
            return `${Number(value).toFixed(2)} GiB/vCPU`;
        },
    },
    {
        accessorKey: "GPU",
        header: "GPUs",
        size: 80,
        id: "GPU",
        filterFn: gt,
        cell: (info) => info.getValue() as number,
    },
    {
        accessorKey: "GPU_model",
        size: 120,
        header: "GPU model",
        id: "GPU_model",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "GPU_model" }),
        cell: (info) => info.getValue() as string,
    },
    {
        accessorKey: "GPU_memory",
        header: "GPU memory",
        size: 130,
        id: "GPU_memory",
        sortingFn: "alphanumeric",
        filterFn: gt,
        cell: (info) => `${info.getValue() as number} GiB`,
    },
    {
        accessorKey: "compute_capability",
        header: "CUDA Compute Capability",
        id: "compute_capability",
        filterFn: regex({ accessorKey: "compute_capability" }),
        cell: (info) => info.getValue() as string,
    },
    {
        accessorKey: "FPGA",
        size: 90,
        header: "FPGAs",
        id: "FPGA",
        filterFn: regex({ accessorKey: "FPGA" }),
        cell: (info) => info.getValue() as number,
    },
    {
        accessorKey: "ECU_per_vcpu",
        header: "ECU per vCPU",
        size: 140,
        id: "ECU_per_vcpu",
        filterFn: regex({ accessorKey: "ECU_per_vcpu" }),
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
        size: 200,
        header: "Physical Processor",
        id: "physical_processor",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "physical_processor" }),
        cell: (info) => info.getValue() || "unknown",
    },
    {
        accessorKey: "clock_speed_ghz",
        header: "Clock Speed(GHz)",
        size: 160,
        id: "clock_speed_ghz",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.clock_speed_ghz?.match(FLOAT);
            const valueB = rowB.original.clock_speed_ghz?.match(FLOAT);
            if (!valueA) return -1;
            if (!valueB) return 1;
            return parseFloat(valueA[0]) - parseFloat(valueB[0]);
        },
        filterFn: regex({
            accessorKey: "clock_speed_ghz",
            fallback: (row, _, filterValue) => {
                // Check the filter value and row have a float.
                const matchFilter = filterValue?.match(FLOAT);
                if (!matchFilter) {
                    // Filter by case insensitive match.
                    const rowValue = row.original.clock_speed_ghz;
                    if (!rowValue) return false;
                    return rowValue
                        .toLowerCase()
                        .includes(filterValue.toLowerCase());
                }
                const rowValue = row.original.clock_speed_ghz?.match(FLOAT);
                if (!rowValue) return false;
                return parseFloat(rowValue[0]) >= parseFloat(matchFilter[0]);
            },
        }),
        cell: (info) => info.getValue() || "unknown",
    },
    {
        accessorKey: "intel_avx",
        header: "Intel AVX",
        size: 110,
        id: "intel_avx",
        filterFn: regex({ accessorKey: "intel_avx" }),
        cell: (info) => (info.getValue() ? "Yes" : "unknown"),
    },
    {
        accessorKey: "intel_avx2",
        header: "Intel AVX2",
        size: 110,
        id: "intel_avx2",
        filterFn: regex({ accessorKey: "intel_avx2" }),
        cell: (info) => (info.getValue() ? "Yes" : "unknown"),
    },
    {
        accessorKey: "intel_avx512",
        header: "Intel AVX-512",
        size: 130,
        id: "intel_avx512",
        filterFn: regex({ accessorKey: "intel_avx512" }),
        cell: (info) => (info.getValue() ? "Yes" : "unknown"),
    },
    {
        accessorKey: "intel_turbo",
        header: "Intel Turbo",
        size: 120,
        id: "intel_turbo",
        filterFn: regex({ accessorKey: "intel_turbo" }),
        cell: (info) => (info.getValue() ? "Yes" : "unknown"),
    },
    {
        accessorKey: "storage",
        header: "Instance Storage",
        size: 160,
        id: "storage",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.storage;
            const valueB = rowB.original.storage;
            if (!valueA) return -1;
            if (!valueB) return 1;
            const totalSizeA = valueA.devices * valueA.size;
            const totalSizeB = valueB.devices * valueB.size;
            return totalSizeA - totalSizeB;
        },
        filterFn: (row, _, filterValue) => {
            if (filterValue === 0) return true;
            const storage = row.original.storage;
            if (!storage) return false;
            const totalSize = storage.devices * storage.size;
            return totalSize >= filterValue;
        },
        cell: (info) => {
            const storage = info.getValue() as Storage;
            if (!storage) return "EBS only";
            const totalSize = storage.devices * storage.size;
            const storageType = `${storage.nvme_ssd ? "NVMe " : ""}${
                storage.ssd ? "SSD" : "HDD"
            }`;
            if (storage.devices > 1) {
                const text = `${totalSize} ${storage.size_unit}`;
                const detail = `${storage.devices}×${storage.size} ${storage.size_unit} ${storageType}`;
                return (
                    <span title={`${text} (${detail})`}>
                        {text}{" "}
                        <span className="text-xs text-gray-2">({detail})</span>
                    </span>
                );
            }
            return `${totalSize} ${storage.size_unit} ${storageType}`;
        },
    },
    {
        accessorKey: "storage",
        header: "Instance Storage: already warmed-up",
        id: "warmed-up",
        sortingFn: (rowA, rowB) => {
            const storageA = rowA.original.storage;
            const storageB = rowB.original.storage;
            if (!storageA) return -1;
            if (!storageB) return 1;
            return storageA.storage_needs_initialization ? 1 : -1;
        },
        ...makeCellWithRegexSorter("storage", (info) => {
            const storage = info.getValue() as Storage;
            if (!storage) return "N/A";
            if (storage.storage_needs_initialization === undefined)
                throw new Error("storage_needs_initialization is undefined");
            return storage.storage_needs_initialization ? "No" : "Yes";
        }),
    },
    {
        accessorKey: "storage",
        header: "Instance Storage: SSD TRIM Support",
        id: "trim-support",
        sortingFn: (rowA, rowB) => {
            const storageA = rowA.original.storage;
            const storageB = rowB.original.storage;
            if (!storageA) return -1;
            if (!storageB) return 1;
            if (!storageA.ssd) return -1;
            if (!storageB.ssd) return 1;
            const valueA = storageA.trim_support;
            const valueB = storageB.trim_support;
            if (valueA === undefined) return -1;
            if (valueB === undefined) return 1;
            return valueA ? 1 : -1;
        },
        ...makeCellWithRegexSorter("storage", (info) => {
            const storage = info.getValue() as Storage;
            if (!storage || !storage.ssd) return "N/A";
            if (storage.trim_support === undefined)
                throw new Error("trim_support is undefined");
            return storage.trim_support ? "Yes" : "No";
        }),
    },
    {
        accessorKey: "arch",
        header: "Arch",
        size: 100,
        id: "arch",
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
            return arch.sort().join(", ");
        }),
    },
    {
        accessorKey: "network_performance",
        header: "Network Performance",
        size: 200,
        id: "network_performance",
        sortingFn: "alphanumeric",
        filterFn: regex({ accessorKey: "network_performance" }),
        cell: (info) => info.getValue() as string,
    },
    {
        accessorKey: "ebs_baseline_bandwidth",
        header: "EBS Optimized: Baseline Bandwidth",
        id: "ebs_baseline_bandwidth",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.ebs_baseline_bandwidth;
            const valueB = rowB.original.ebs_baseline_bandwidth;
            if (!valueA) return -1;
            if (!valueB) return 1;
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("ebs_baseline_bandwidth", (info) => {
            const value = info.getValue();
            if (!value) return "N/A";
            return `${value} Mbps`;
        }),
    },
    {
        accessorKey: "ebs_baseline_throughput",
        header: "EBS Optimized: Baseline Throughput (128K)",
        id: "ebs_baseline_throughput",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter(
            "ebs_baseline_throughput",
            (info) => `${info.getValue() as number} MB/s`,
        ),
    },
    {
        accessorKey: "ebs_baseline_iops",
        header: "EBS Optimized: Baseline IOPS (16K)",
        id: "ebs_baseline_iops",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter(
            "ebs_baseline_iops",
            (info) => `${info.getValue() as number} IOPS`,
        ),
    },
    {
        accessorKey: "ebs_max_bandwidth",
        header: "EBS Optimized: Max Bandwidth",
        id: "ebs_max_bandwidth",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.ebs_max_bandwidth;
            const valueB = rowB.original.ebs_max_bandwidth;
            if (!valueA) return -1;
            if (!valueB) return 1;
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("ebs_max_bandwidth", (info) => {
            const value = info.getValue();
            if (!value) return "N/A";
            return `${value} Mbps`;
        }),
    },
    {
        accessorKey: "ebs_throughput",
        header: "EBS Optimized: Max Throughput (128K)",
        id: "ebs_throughput",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter(
            "ebs_throughput",
            (info) => `${info.getValue() as number} MB/s`,
        ),
    },
    {
        accessorKey: "ebs_iops",
        header: "EBS Optimized: Max IOPS (16K)",
        id: "ebs_iops",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter(
            "ebs_iops",
            (info) => `${info.getValue() as number} IOPS`,
        ),
    },
    {
        accessorKey: "ebs_as_nvme",
        header: "EBS Exposed as NVMe",
        id: "ebs_as_nvme",
        ...makeCellWithRegexSorter("ebs_as_nvme", (info) =>
            info.getValue() ? "Yes" : "No",
        ),
    },
    {
        accessorKey: "vpc",
        header: "Max IPs",
        size: 100,
        id: "maxips",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.vpc;
            const valueB = rowB.original.vpc;
            if (!valueA) return -1;
            if (!valueB) return 1;
            return (
                valueA.max_enis * valueA.ips_per_eni -
                valueB.max_enis * valueB.ips_per_eni
            );
        },
        filterFn: (row, _, filterValue) => {
            const vpc = row.original.vpc;
            if (!vpc) return false;
            const maxIps = vpc.max_enis * vpc.ips_per_eni;
            return maxIps >= filterValue;
        },
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
        size: 100,
        id: "maxenis",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.vpc;
            const valueB = rowB.original.vpc;
            if (!valueA) return -1;
            if (!valueB) return 1;
            return valueA.max_enis - valueB.max_enis;
        },
        ...makeCellWithRegexSorter("vpc", (info) => {
            const vpc = info.getValue() as any;
            if (!vpc) return "N/A";
            return vpc.max_enis;
        }),
    },
    {
        accessorKey: "enhanced_networking",
        header: "Enhanced Networking",
        id: "enhanced_networking",
        ...makeCellWithRegexSorter("enhanced_networking", (info) => {
            return info.getValue() ? "Yes" : "No";
        }),
    },
    {
        accessorKey: "vpc_only",
        header: "VPC Only",
        size: 110,
        id: "vpc_only",
        ...makeCellWithRegexSorter("vpc_only", (info) => {
            return info.getValue() ? "Yes" : "No";
        }),
    },
    {
        accessorKey: "ipv6_support",
        header: "IPv6 Support",
        size: 130,
        id: "ipv6_support",
        ...makeCellWithRegexSorter("ipv6_support", (info) =>
            info.getValue() ? "Yes" : "No",
        ),
    },
    {
        accessorKey: "placement_group_support",
        header: "Placement Group Support",
        id: "placement_group_support",
        ...makeCellWithRegexSorter("placement_group_support", (info) =>
            info.getValue() ? "Yes" : "No",
        ),
    },
    {
        accessorKey: "linux_virtualization_types",
        header: "Linux Virtualization",
        id: "linux_virtualization_types",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.linux_virtualization_types;
            const valueB = rowB.original.linux_virtualization_types;
            if (!valueA) return -1;
            if (!valueB) return 1;

            // I can't think of a better way to do this
            return valueA.join(", ").localeCompare(valueB.join(", "));
        },
        ...makeCellWithRegexSorter("linux_virtualization_types", (info) => {
            const types = info.getValue() as string[];
            return types?.length ? types.join(", ") : "Unknown";
        }),
    },
    {
        accessorKey: "emr",
        header: "On EMR",
        size: 100,
        id: "emr",
        ...makeCellWithRegexSorter("emr", (info) =>
            info.getValue() ? "Yes" : "No",
        ),
    },
    {
        accessorKey: "availability_zones",
        header: "Availability Zones",
        id: "availability_zones",
        sortingFn: (rowA, rowB) => {
            const valueA = rowA.original.availability_zones?.[selectedRegion];
            const valueB = rowB.original.availability_zones?.[selectedRegion];
            if (!valueA) return -1;
            if (!valueB) return 1;
            return valueA.join(", ").localeCompare(valueB.join(", "));
        },
        ...makeCellWithRegexSorter("availability_zones", (info) => {
            const zones = info.getValue() as Record<string, string[]>;
            return zones?.[selectedRegion]?.join(", ") || "";
        }),
    },
    {
        accessorKey: "pricing",
        header: "On Demand",
        size: 150,
        id: "cost-ondemand",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linux?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linux?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.linux?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux Reserved cost",
        size: 180,
        id: "cost-reserved",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linux?.reserved?.[
                    reservedTerm
                ],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linux?.reserved?.[
                    reservedTerm
                ],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.linux?.reserved?.[reservedTerm];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux Spot Minimum cost",
        size: 180,
        id: "cost-spot-min",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linux?.spot_min,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linux?.spot_min,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.linux?.spot_min;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux Spot Average cost",
        size: 180,
        id: "cost-spot-max",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linux?.spot_avg,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linux?.spot_avg,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.linux?.spot_avg;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "RHEL On Demand cost",
        size: 180,
        id: "cost-ondemand-rhel",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.rhel?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.rhel?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.rhel?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "RHEL Reserved cost",
        id: "cost-reserved-rhel",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.rhel?.reserved?.[
                    reservedTerm
                ],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.rhel?.reserved?.[
                    reservedTerm
                ],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.rhel?.reserved?.[reservedTerm];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "RHEL Spot Minimum cost",
        id: "cost-spot-min-rhel",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.rhel?.spot_min,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.rhel?.spot_min,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.rhel?.spot_min;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "RHEL Spot Maximum cost",
        id: "cost-spot-max-rhel",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.rhel?.spot_max,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.rhel?.spot_max,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.rhel?.spot_max;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "SLES On Demand cost",
        id: "cost-ondemand-sles",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.sles?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.sles?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.sles?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "SLES Reserved cost",
        id: "cost-reserved-sles",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.sles?.reserved?.[
                    reservedTerm
                ],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.sles?.reserved?.[
                    reservedTerm
                ],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.sles?.reserved?.[reservedTerm];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "SLES Spot Minimum cost",
        id: "cost-spot-min-sles",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.sles?.spot_min,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.sles?.spot_min,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.sles?.spot_min;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "SLES Spot Maximum cost",
        id: "cost-spot-max-sles",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.sles?.spot_max,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.sles?.spot_max,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.sles?.spot_max;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows On Demand cost",
        id: "cost-ondemand-mswin",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswin?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswin?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.mswin?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows Reserved cost",
        id: "cost-reserved-mswin",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswin?.reserved?.[
                    reservedTerm
                ],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswin?.reserved?.[
                    reservedTerm
                ],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.mswin?.reserved?.[reservedTerm];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows Spot Minimum cost",
        id: "cost-spot-min-mswin",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswin?.spot_min,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswin?.spot_min,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.mswin?.spot_min;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows Spot Average cost",
        id: "cost-spot-max-mswin",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswin?.spot_avg,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswin?.spot_avg,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.mswin?.spot_avg;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Dedicated Host On Demand",
        id: "cost-ondemand-dedicated",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.dedicated?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.dedicated?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.dedicated?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Dedicated Host Reserved",
        id: "cost-reserved-dedicated",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.dedicated?.reserved?.[
                    reservedTerm
                ],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.dedicated?.reserved?.[
                    reservedTerm
                ],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.dedicated?.reserved?.[reservedTerm];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows SQL Web On Demand cost",
        id: "cost-ondemand-mswinSQLWeb",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswinSQLWeb?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswinSQLWeb?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.mswinSQLWeb?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows SQL Web Reserved cost",
        id: "cost-reserved-mswinSQLWeb",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswinSQLWeb
                    ?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswinSQLWeb
                    ?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.mswinSQLWeb?.reserved?.[
                    reservedTerm
                ];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows SQL Std On Demand cost",
        id: "cost-ondemand-mswinSQL",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswinSQL?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswinSQL?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.mswinSQL?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows SQL Std Reserved cost",
        id: "cost-reserved-mswinSQL",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswinSQL?.reserved?.[
                    reservedTerm
                ],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswinSQL?.reserved?.[
                    reservedTerm
                ],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.mswinSQL?.reserved?.[reservedTerm];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows SQL Ent On Demand cost",
        id: "cost-ondemand-mswinSQLEnterprise",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswinSQLEnterprise
                    ?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswinSQLEnterprise
                    ?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.mswinSQLEnterprise?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Windows SQL Ent Reserved cost",
        id: "cost-reserved-mswinSQLEnterprise",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.mswinSQLEnterprise
                    ?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.mswinSQLEnterprise
                    ?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.mswinSQLEnterprise?.reserved?.[
                    reservedTerm
                ];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux SQL Web On Demand cost",
        id: "cost-ondemand-linuxSQLWeb",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linuxSQLWeb?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linuxSQLWeb?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.linuxSQLWeb?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux SQL Web Reserved cost",
        id: "cost-reserved-linuxSQLWeb",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linuxSQLWeb
                    ?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linuxSQLWeb
                    ?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.linuxSQLWeb?.reserved?.[
                    reservedTerm
                ];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux SQL Std On Demand cost",
        id: "cost-ondemand-linuxSQL",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linuxSQL?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linuxSQL?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.linuxSQL?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux SQL Std Reserved cost",
        id: "cost-reserved-linuxSQL",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linuxSQL?.reserved?.[
                    reservedTerm
                ],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linuxSQL?.reserved?.[
                    reservedTerm
                ],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.linuxSQL?.reserved?.[reservedTerm];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux SQL Ent On Demand cost",
        id: "cost-ondemand-linuxSQLEnterprise",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linuxSQLEnterprise
                    ?.ondemand,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linuxSQLEnterprise
                    ?.ondemand,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.linuxSQLEnterprise?.ondemand;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux SQL Ent Reserved cost",
        id: "cost-reserved-linuxSQLEnterprise",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.linuxSQLEnterprise
                    ?.reserved?.[reservedTerm],
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.linuxSQLEnterprise
                    ?.reserved?.[reservedTerm],
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price =
                pricing?.[selectedRegion]?.linuxSQLEnterprise?.reserved?.[
                    reservedTerm
                ];
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "pricing",
        header: "Linux Spot Interrupt Frequency",
        id: "spot-interrupt-rate",
        sortingFn: (rowA, rowB) => {
            const valueA =
                rowA.original.pricing?.[selectedRegion]?.linux?.pct_interrupt;
            const valueB =
                rowB.original.pricing?.[selectedRegion]?.linux?.pct_interrupt;
            if (!valueA) return -1;
            if (!valueB) return 1;
            return valueA.localeCompare(valueB);
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const pctInterrupt =
                pricing?.[selectedRegion]?.linux?.pct_interrupt;
            if (pctInterrupt === "N/A") return "unavailable";
            return pctInterrupt;
        }),
    },
    {
        accessorKey: "pricing",
        header: "EMR cost",
        size: 100,
        id: "cost-emr",
        sortingFn: (rowA, rowB) => {
            const valueA = calculateCost(
                rowA.original.pricing?.[selectedRegion]?.emr?.emr,
                rowA.original,
                pricingUnit,
                costDuration,
            );
            const valueB = calculateCost(
                rowB.original.pricing?.[selectedRegion]?.emr?.emr,
                rowB.original,
                pricingUnit,
                costDuration,
            );
            return valueA - valueB;
        },
        ...makeCellWithRegexSorter("pricing", (info) => {
            const pricing = info.getValue() as Pricing | undefined;
            const price = pricing?.[selectedRegion]?.emr?.emr;
            return calculateAndFormatCost(
                price,
                info.row.original,
                pricingUnit,
                costDuration,
            );
        }),
    },
    {
        accessorKey: "generation",
        header: "Generation",
        size: 120,
        id: "generation",
        sortingFn: "alphanumeric",
        ...makeCellWithRegexSorter(
            "pricing",
            (info) => info.getValue() as string,
        ),
    },
];
