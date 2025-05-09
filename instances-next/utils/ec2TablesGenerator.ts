import { EC2Instance } from "@/types";

type Row = {
    name: string;
    children: any;
    bgStyled?: boolean;
    help?: string | undefined;
    helpText?: string | undefined;
};

type Table = {
    name: string;
    slug: string;
    rows: Row[];
};

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export function ec2(instance: Omit<EC2Instance, "pricing">): Table[] {
    return [
        {
            name: "Compute",
            slug: "compute",
            rows: [
                {
                    name: "vCPUs",
                    children: instance.vCPU,
                },
                {
                    name: "Memory (GiB)",
                    children: instance.memory,
                },
                {
                    name: "Memory per vCPU (GiB)",
                    children: round(instance.memory / instance.vCPU),
                },
                {
                    name: "Physical Processor",
                    children: instance.physical_processor || "N/A",
                },
                {
                    name: "Clock Speed (GHz)",
                    children: instance.clock_speed_ghz || "N/A",
                },
                {
                    name: "CPU Architecture",
                    children: instance.arch[0] || "N/A",
                },
                {
                    name: "GPU",
                    children: instance.GPU ?? "N/A",
                    bgStyled: true,
                },
                {
                    name: "GPU Architecture",
                    children: instance.GPU_model ?? "none",
                    bgStyled: true,
                },
                {
                    name: "Video Memory (GiB)",
                    children: instance.GPU_memory || "0",
                },
                {
                    name: "GPU Compute Capability",
                    help: "https://handbook.vantage.sh/aws/reference/aws-gpu-instances/",
                    children: instance.compute_capability || "0",
                },
                {
                    name: "FPGA",
                    children: instance.FPGA ?? "0",
                    bgStyled: true,
                },
            ],
        },
        {
            name: "Networking",
            slug: "networking",
            rows: [
                {
                    name: "Network Performance (Gibps)",
                    children: instance.network_performance
                        .toLowerCase()
                        .replace("gigabit", "")
                        .trim(),
                },
                {
                    name: "Enhanced Networking",
                    children: instance.enhanced_networking,
                    bgStyled: true,
                },
                {
                    name: "IPv6",
                    children: instance.ipv6_support,
                    bgStyled: true,
                },
                {
                    name: "Placement Group",
                    help: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html",
                    children: instance.placement_group_support,
                },
            ],
        },
        {
            name: "Storage",
            slug: "storage",
            rows: [
                {
                    name: "EBS Optimized",
                    children: instance.ebs_optimized,
                    bgStyled: true,
                },
                {
                    name: "Max Bandwidth (Mbps) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_max_bandwidth,
                },
                {
                    name: "Max Throughput (MB/s) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_throughput,
                },
                {
                    name: "Max I/O operations/second",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_iops,
                },
                {
                    name: "Baseline Bandwidth (Mbps) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_bandwidth,
                },
                {
                    name: "Baseline Throughput (MB/s) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_throughput,
                },
                {
                    name: "Baseline I/O operations/second",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_baseline_iops,
                },
                {
                    name: "Devices",
                    children: instance.storage?.devices || "0",
                },
                {
                    name: "Swap Partition",
                    children:
                        instance.storage?.includes_swap_partition ?? false,
                    bgStyled: true,
                },
                {
                    name: "NVME Drive",
                    help: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html#ec2-nitro-instances",
                    children: instance.storage?.nvme_ssd ?? false,
                    bgStyled: true,
                },
                {
                    name: "Disk Space (GiB)",
                    children: instance.storage?.size || "0",
                },
                {
                    name: "SSD",
                    children: instance.storage?.ssd ?? false,
                    bgStyled: true,
                },
                {
                    name: "Initialize Storage",
                    children:
                        instance.storage?.storage_needs_initialization ?? false,
                    bgStyled: true,
                },
            ],
        },
        {
            name: "Amazon",
            slug: "amazon",
            rows: [
                {
                    name: "Generation",
                    children: instance.generation,
                    bgStyled: true,
                },
                {
                    name: "Instance Type",
                    children: instance.instance_type,
                },
                {
                    name: "Family",
                    children: instance.family || "N/A",
                },
                {
                    name: "Name",
                    children: instance.pretty_name,
                },
                {
                    name: "Elastic Map Reduce",
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
            name: "Compute",
            slug: "Compute",
            rows: [
                {
                    name: "vCPUs",
                    children: instance.vCPU,
                },
                {
                    name: "Memory (GiB)",
                    children: instance.memory,
                },
                {
                    name: "Physical Processor",
                    children: instance.physical_processor || "N/A",
                },
                {
                    name: "CPU Architecture",
                    children: instance.arch || "N/A",
                },
            ],
        },
        {
            name: "Storage",
            slug: "storage",
            rows: [
                {
                    name: "EBS Optimized",
                    children: instance.ebs_optimized || false,
                    bgStyled: true,
                },
                {
                    name: "Max Bandwidth (Mbps) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_max_bandwidth,
                },
                {
                    name: "Max Throughput (MB/s) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_throughput,
                },
                {
                    name: "Max I/O operations/second",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_iops,
                },
                {
                    name: "Baseline Bandwidth (Mbps) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_bandwidth,
                },
                {
                    name: "Baseline Throughput (MB/s) on",
                    helpText: "EBS",
                    help: "https://handbook.vantage.sh/aws/services/ebs-pricing/",
                    children: instance.ebs_baseline_throughput,
                },
                {
                    name: "Baseline I/O operations/second",
                    helpText: "IOPS",
                    help: "https://handbook.vantage.sh/aws/concepts/io-operations/",
                    children: instance.ebs_baseline_iops,
                },
            ],
        },
        {
            name: "Networking",
            slug: "Networking",
            rows: [
                {
                    name: "Network Performance (Gibps)",
                    children: (instance.network_performance || "N/A")
                        .replace("Gigabit", "")
                        .trim(),
                },
            ],
        },
        {
            name: "Amazon",
            slug: "amazon",
            rows: [
                {
                    name: "Generation",
                    // @ts-expect-error: RDS specific
                    children: instance.currentGeneration === "Yes" ? "current" : "previous",
                    bgStyled: true,
                },
                {
                    name: "Instance Type",
                    children: instance.instance_type,
                },
                {
                    name: "Family",
                    children: instance.family || "N/A",
                },
                {
                    name: "Name",
                    children: instance.pretty_name,
                },
                {
                    name: "Normalization Factor",
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
            name: "Redis Max Memory (MiB)",
            children: handleSize(instance["redis6.x-maxmemory"]),
        },
        {
            name: "Cache Max Buffer Size (MiB)",
            children: handleSize(instance["redis6.x-client-output-buffer-limit-replica-hard-limit"]),
        },
        {
            name: "Redis Max Clients",
            children: instance.max_clients,
        },
        {
            name: "Memcached Max Thread Count",
            children: instance["memcached1.6-num_threads"],
        },
    ];
}

export function elasticache(instance: Omit<EC2Instance, "pricing">): Table[] {
    return [
        {
            name: "Compute",
            slug: "compute",
            rows: [
                {
                    name: "CPUs",
                    children: instance.vCPU,
                },
                {
                    name: "Memory (GiB)",
                    children: instance.memory,
                },
                {
                    name: "Memory per vCPU (GiB)",
                    children: round(instance.memory / instance.vCPU),
                },
                ...elasticacheSpecificRows(instance as ElasticacheExt),
            ],
        },
        {
            name: "Networking",
            slug: "Networking",
            rows: [
                {
                    name: "Network Performance (Gibps)",
                    children: (instance.network_performance || "N/A")
                        .replace("Gigabit", "")
                        .trim(),
                },
            ],
        },
        {
            name: "Amazon",
            slug: "amazon",
            rows: [
                {
                    name: "Generation",
                    // @ts-expect-error: RDS specific
                    children: instance.currentGeneration === "Yes" ? "current" : "previous",
                    bgStyled: true,
                },
                {
                    name: "Instance Type",
                    children: instance.instance_type,
                },
                {
                    name: "Family",
                    children: instance.family || "N/A",
                },
                {
                    name: "Name",
                    children: instance.pretty_name,
                },
            ],
        },
    ];
}
