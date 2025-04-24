import { Instance } from "@/types";
import { ColumnDef } from "@tanstack/react-table";

interface Storage {
    devices: number;
    size: number;
    size_unit: string;
    nvme_ssd: boolean;
    ssd: boolean;
}

// TODO: factor in pricing unit and cost duration

export default (selectedRegion: string, reservedTerm: string): ColumnDef<Instance>[] => [
    {
        accessorKey: "pretty_name",
        header: "Name",
        id: "pretty_name",
        size: 350,
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
