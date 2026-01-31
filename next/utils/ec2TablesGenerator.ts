import { EC2Instance } from "@/types";

type Row = {
    nameKey: string;
    children: any;
    bgStyled?: boolean;
    help?: string | undefined;
    helpText?: string | undefined;
};

export type Table = {
    nameKey: string;
    slug: string;
    rows: Row[];
};

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export function ec2(instance: Omit<EC2Instance, "pricing">): Table[] {
    return [
        {
            nameKey: "compute",
            slug: "compute",
            rows: [
                {
                    nameKey: "vCPUs",
                    children: instance.vCPU,
                },
                {
                    nameKey: "memoryGiB",
                    children: instance.memory,
                },
                {
                    nameKey: "memoryPerVCPU",
                    children: round(instance.memory / instance.vCPU),
                },
                {
                    nameKey: "physicalProcessor",
                    children: instance.physical_processor || "N/A",
                },
                {
                    nameKey: "clockSpeed",
                    children: instance.clock_speed_ghz || "N/A",
                },
                {
                    nameKey: "cpuArchitecture",
                    children: instance.arch[0] || "N/A",
                },
                {
                    nameKey: "gpu",
                    children: instance.GPU ?? "N/A",
                    bgStyled: true,
                },
                {
                    nameKey: "gpuWattage",
                    children: `${instance.gpu_power_draw_watts_avg || "0"} W`,
                },
                {
                    nameKey: "gpuArchitecture",
                    children: instance.GPU_model ?? "none",
                    bgStyled: true,
                },
                {
                    nameKey: "videoMemory",
                    children: instance.GPU_memory || "0",
                },
                {
                    nameKey: "gpuComputeCapability",
                    help: "https://handbook.vantage.sh/aws/reference/aws-gpu-instances/",
                    children: instance.compute_capability || "0",
                },
                {
                    nameKey: "fpga",
                    children: instance.FPGA ?? "0",
                    bgStyled: true,
                },
                {
                    nameKey: "ffmpegFps",
                    children: instance.ffmpeg_fps || "N/A",
                },
                {
                    nameKey: "coremarkIterations",
                    children: instance.coremark_iterations_second || "N/A",
                },
            ],
        },
        {
            nameKey: "numa",
            slug: "numa",
            rows: [
                {
                    nameKey: "usesNuma",
                    children:
                        typeof instance.uses_numa_architecture !== "boolean"
                            ? "N/A"
                            : instance.uses_numa_architecture
                              ? "Yes"
                              : "No",
                    help: "https://en.wikipedia.org/wiki/Non-uniform_memory_access",
                },
                {
                    nameKey: "numaNodeCount",
                    children: instance.numa_node_count ?? "N/A",
                },
                {
                    nameKey: "maxNumaDistance",
                    children: instance.max_numa_distance ?? "N/A",
                },
                {
                    nameKey: "coresPerNuma",
                    children: instance.core_count_per_numa_node
                        ? instance.core_count_per_numa_node.toFixed(1)
                        : "N/A",
                },
                {
                    nameKey: "threadsPerNuma",
                    children: instance.thread_count_per_numa_node
                        ? instance.thread_count_per_numa_node.toFixed(1)
                        : "N/A",
                },
                {
                    nameKey: "memoryPerNuma",
                    children: instance.memory_per_numa_node_mb
                        ? `${instance.memory_per_numa_node_mb.toFixed(0)} MB`
                        : "N/A",
                },
                {
                    nameKey: "l3CachePerNuma",
                    children: instance.l3_per_numa_node_mb
                        ? `${instance.l3_per_numa_node_mb.toFixed(1)} MB`
                        : "N/A",
                },
                {
                    nameKey: "l3CacheShared",
                    children:
                        typeof instance.l3_shared !== "boolean"
                            ? "N/A"
                            : instance.l3_shared
                              ? "Yes"
                              : "No",
                },
            ],
        },
        {
            nameKey: "networking",
            slug: "networking",
            rows: [
                {
                    nameKey: "networkPerformance",
                    children: (instance.network_performance || "N/A")
                        .toLowerCase()
                        .replace("gigabit", "")
                        .trim(),
                },
                {
                    nameKey: "enhancedNetworking",
                    children: instance.enhanced_networking,
                    bgStyled: true,
                },
                {
                    nameKey: "ipv6",
                    children: instance.ipv6_support,
                    bgStyled: true,
                },
                {
                    nameKey: "placementGroup",
                    help: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html",
                    children: instance.placement_group_support,
                },
            ],
        },
        {
            nameKey: "storage",
            slug: "storage",
            rows: [
                {
                    nameKey: "ebsOptimized",
                    children: instance.ebs_optimized,
                    bgStyled: true,
                },
                {
                    nameKey: "maxBandwidthEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_max_bandwidth,
                },
                {
                    nameKey: "maxThroughputEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_throughput,
                },
                {
                    nameKey: "maxIops",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_iops,
                },
                {
                    nameKey: "baselineBandwidthEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_bandwidth,
                },
                {
                    nameKey: "baselineThroughputEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_throughput,
                },
                {
                    nameKey: "baselineIops",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_baseline_iops,
                },
                {
                    nameKey: "devices",
                    children: instance.storage?.devices || "0",
                },
                {
                    nameKey: "swapPartition",
                    children:
                        instance.storage?.includes_swap_partition ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "nvmeDrive",
                    help: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html#ec2-nitro-instances",
                    children: instance.storage?.nvme_ssd ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "diskSpace",
                    children: instance.storage?.size || "0",
                },
                {
                    nameKey: "ssd",
                    children: instance.storage?.ssd ?? false,
                    bgStyled: true,
                },
                {
                    nameKey: "initializeStorage",
                    children:
                        instance.storage?.storage_needs_initialization ?? false,
                    bgStyled: true,
                },
            ],
        },
        {
            nameKey: "amazon",
            slug: "amazon",
            rows: [
                {
                    nameKey: "generation",
                    children: instance.generation,
                    bgStyled: true,
                },
                {
                    nameKey: "instanceType",
                    children: instance.instance_type,
                },
                {
                    nameKey: "family",
                    children: instance.family || "N/A",
                },
                {
                    nameKey: "name",
                    children: instance.pretty_name,
                },
                {
                    nameKey: "elasticMapReduce",
                    helpText: "EMR",
                    help: "https://handbook.vantage.sh/aws/services/emr-pricing/",
                    children: instance.emr,
                    bgStyled: true,
                },
            ],
        },
    ];
}

export function rds(instance: Omit<EC2Instance, "pricing">): Table[] {
    return [
        {
            nameKey: "compute",
            slug: "Compute",
            rows: [
                {
                    nameKey: "vCPUs",
                    children: instance.vCPU,
                },
                {
                    nameKey: "memoryGiB",
                    children: instance.memory,
                },
                {
                    nameKey: "physicalProcessor",
                    children: instance.physical_processor || "N/A",
                },
                {
                    nameKey: "cpuArchitecture",
                    children: instance.arch || "N/A",
                },
            ],
        },
        {
            nameKey: "storage",
            slug: "storage",
            rows: [
                {
                    nameKey: "ebsOptimized",
                    children: instance.ebs_optimized || false,
                    bgStyled: true,
                },
                {
                    nameKey: "maxBandwidthEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_max_bandwidth,
                },
                {
                    nameKey: "maxThroughputEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_throughput,
                },
                {
                    nameKey: "maxIops",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_iops,
                },
                {
                    nameKey: "baselineBandwidthEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_bandwidth,
                },
                {
                    nameKey: "baselineThroughputEbs",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_throughput,
                },
                {
                    nameKey: "baselineIops",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_baseline_iops,
                },
            ],
        },
        {
            nameKey: "networking",
            slug: "Networking",
            rows: [
                {
                    nameKey: "networkPerformance",
                    children: (instance.network_performance || "N/A")
                        .replace("Gigabit", "")
                        .trim(),
                },
            ],
        },
        {
            nameKey: "amazon",
            slug: "amazon",
            rows: [
                {
                    nameKey: "generation",
                    children:
                        // @ts-expect-error: RDS specific
                        instance.currentGeneration === "Yes"
                            ? "current"
                            : "previous",
                    bgStyled: true,
                },
                {
                    nameKey: "instanceType",
                    children: instance.instance_type,
                },
                {
                    nameKey: "family",
                    children: instance.family || "N/A",
                },
                {
                    nameKey: "name",
                    children: instance.pretty_name,
                },
                {
                    nameKey: "normalizationFactor",
                    // @ts-expect-error: RDS specific
                    children: instance.normalizationSizeFactor,
                },
            ],
        },
    ];
}

interface ElasticacheExt extends Omit<EC2Instance, "pricing"> {
    "memcached1.6-num_threads": string;
    "redis6.x-maxmemory": string;
    max_clients: string;
    "redis6.x-client-output-buffer-limit-replica-hard-limit": string;
}

function handleSize(size: string | undefined) {
    if (!size) return "N/A";
    const num = Number(size);
    if (isNaN(num)) return size;
    return Math.floor(num / 1024 / 1024);
}

function elasticacheSpecificRows(instance: ElasticacheExt): Row[] {
    return [
        {
            nameKey: "redisMaxMemory",
            children: handleSize(instance["redis6.x-maxmemory"]),
        },
        {
            nameKey: "cacheMaxBuffer",
            children: handleSize(
                instance[
                    "redis6.x-client-output-buffer-limit-replica-hard-limit"
                ],
            ),
        },
        {
            nameKey: "redisMaxClients",
            children: instance.max_clients,
        },
        {
            nameKey: "memcachedMaxThreads",
            children: instance["memcached1.6-num_threads"],
        },
    ];
}

export function elasticache(instance: Omit<EC2Instance, "pricing">): Table[] {
    return [
        {
            nameKey: "compute",
            slug: "compute",
            rows: [
                {
                    nameKey: "cpus",
                    children: instance.vCPU,
                },
                {
                    nameKey: "memoryGiB",
                    children: instance.memory,
                },
                {
                    nameKey: "memoryPerVCPU",
                    children: round(instance.memory / instance.vCPU),
                },
                ...elasticacheSpecificRows(instance as ElasticacheExt),
            ],
        },
        {
            nameKey: "networking",
            slug: "Networking",
            rows: [
                {
                    nameKey: "networkPerformance",
                    children: (instance.network_performance || "N/A")
                        .replace("Gigabit", "")
                        .trim(),
                },
            ],
        },
        {
            nameKey: "amazon",
            slug: "amazon",
            rows: [
                {
                    nameKey: "generation",
                    children:
                        // @ts-expect-error: RDS specific
                        instance.currentGeneration === "Yes"
                            ? "current"
                            : "previous",
                    bgStyled: true,
                },
                {
                    nameKey: "instanceType",
                    children: instance.instance_type,
                },
                {
                    nameKey: "family",
                    children: instance.family || "N/A",
                },
                {
                    nameKey: "name",
                    children: instance.pretty_name,
                },
            ],
        },
    ];
}
