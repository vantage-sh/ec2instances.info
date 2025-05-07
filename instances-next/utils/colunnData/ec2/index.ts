import { makeSchemaWithDefaults, doAllDataTablesMigrations } from "../shared";

export { columnsGen } from "./columns";

const initialColumnsArr = [
    ["pretty_name", true],
    ["instance_type", true],
    ["family", false],
    ["memory", true],
    ["ECU", false],
    ["vCPU", true],
    ["memory_per_vcpu", false],
    ["GPU", false],
    ["GPU_model", false],
    ["GPU_memory", false],
    ["compute_capability", false],
    ["FPGA", false],
    ["ECU_per_vcpu", false],
    ["physical_processor", false],
    ["clock_speed_ghz", false],
    ["intel_avx", false],
    ["intel_avx2", false],
    ["intel_avx512", false],
    ["intel_turbo", false],
    ["storage", true],
    ["warmed-up", false],
    ["trim-support", false],
    ["arch", false],
    ["network_performance", true],
    ["ebs_baseline_bandwidth", false],
    ["ebs_baseline_throughput", false],
    ["ebs_baseline_iops", false],
    ["ebs_max_bandwidth", false],
    ["ebs_throughput", false],
    ["ebs_iops", false],
    ["ebs_as_nvme", false],
    ["maxips", false],
    ["maxenis", false],
    ["enhanced_networking", false],
    ["vpc_only", false],
    ["ipv6_support", false],
    ["placement_group_support", false],
    ["linux_virtualization_types", false],
    ["emr", false],
    ["availability_zones", false],
    ["cost-ondemand", true],
    ["cost-reserved", true],
    ["cost-spot-min", true],
    ["cost-spot-max", false],
    ["cost-ondemand-rhel", false],
    ["cost-reserved-rhel", false],
    ["cost-spot-min-rhel", false],
    ["cost-spot-max-rhel", false],
    ["cost-ondemand-sles", false],
    ["cost-reserved-sles", false],
    ["cost-spot-min-sles", false],
    ["cost-spot-max-sles", false],
    ["cost-ondemand-mswin", true],
    ["cost-reserved-mswin", true],
    ["cost-spot-min-mswin", false],
    ["cost-spot-max-mswin", false],
    ["cost-ondemand-dedicated", false],
    ["cost-reserved-dedicated", false],
    ["cost-ondemand-mswinSQLWeb", false],
    ["cost-reserved-mswinSQLWeb", false],
    ["cost-ondemand-mswinSQL", false],
    ["cost-reserved-mswinSQL", false],
    ["cost-ondemand-mswinSQLEnterprise", false],
    ["cost-reserved-mswinSQLEnterprise", false],
    ["cost-ondemand-linuxSQLWeb", false],
    ["cost-reserved-linuxSQLWeb", false],
    ["cost-ondemand-linuxSQL", false],
    ["cost-reserved-linuxSQL", false],
    ["cost-ondemand-linuxSQLEnterprise", false],
    ["cost-reserved-linuxSQLEnterprise", false],
    ["spot-interrupt-rate", false],
    ["cost-emr", false],
    ["generation", false],
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
    return doAllDataTablesMigrations("/", initialColumnsArr, initialColumnsValue);
}

export function makePrettyNames<V>(makeColumnOption: (key: keyof typeof initialColumnsValue, label: string) => V) {
    return [
        makeColumnOption("pretty_name", "Name"),
        makeColumnOption("instance_type", "API Name"),
        makeColumnOption("family", "Instance Family"),
        makeColumnOption("memory", "Memory"),
        makeColumnOption("ECU", "Compute Units (ECU)"),
        makeColumnOption("vCPU", "vCPUs"),
        makeColumnOption("memory_per_vcpu", "GiB of Memory per vCPU"),
        makeColumnOption("GPU", "GPUs"),
        makeColumnOption("GPU_model", "GPU model"),
        makeColumnOption("GPU_memory", "GPU memory"),
        makeColumnOption("compute_capability", "CUDA Compute Capability"),
        makeColumnOption("FPGA", "FPGAs"),
        makeColumnOption("ECU_per_vcpu", "ECU per vCPU"),
        makeColumnOption("physical_processor", "Physical Processor"),
        makeColumnOption("clock_speed_ghz", "Clock Speed(GHz)"),
        makeColumnOption("intel_avx", "Intel AVX"),
        makeColumnOption("intel_avx2", "Intel AVX2"),
        makeColumnOption("intel_avx512", "Intel AVX-512"),
        makeColumnOption("intel_turbo", "Intel Turbo"),
        makeColumnOption("storage", "Instance Storage"),
        makeColumnOption(
            "warmed-up",
            "Instance Storage: already warmed-up",
        ),
        makeColumnOption(
            "trim-support",
            "Instance Storage: SSD TRIM Support",
        ),
        makeColumnOption("arch", "Arch"),
        makeColumnOption("network_performance", "Network Performance"),
        makeColumnOption(
            "ebs_baseline_bandwidth",
            "EBS Optimized: Baseline Bandwidth",
        ),
        makeColumnOption(
            "ebs_baseline_throughput",
            "EBS Optimized: Baseline Throughput (128K)",
        ),
        makeColumnOption(
            "ebs_baseline_iops",
            "EBS Optimized: Baseline IOPS (16K)",
        ),
        makeColumnOption(
            "ebs_max_bandwidth",
            "EBS Optimized: Max Bandwidth",
        ),
        makeColumnOption(
            "ebs_throughput",
            "EBS Optimized: Max Throughput (128K)",
        ),
        makeColumnOption("ebs_iops", "EBS Optimized: Max IOPS (16K)"),
        makeColumnOption("ebs_as_nvme", "EBS Exposed as NVMe"),
        makeColumnOption("maxips", "Max IPs"),
        makeColumnOption("maxenis", "Max ENIs"),
        makeColumnOption("enhanced_networking", "Enhanced Networking"),
        makeColumnOption("vpc_only", "VPC Only"),
        makeColumnOption("ipv6_support", "IPv6 Support"),
        makeColumnOption(
            "placement_group_support",
            "Placement Group Support",
        ),
        makeColumnOption(
            "linux_virtualization_types",
            "Linux Virtualization",
        ),
        makeColumnOption("emr", "On EMR"),
        makeColumnOption("availability_zones", "Availability Zones"),
        makeColumnOption("cost-ondemand", "On Demand"),
        makeColumnOption("cost-reserved", "Linux Reserved cost"),
        makeColumnOption("cost-spot-min", "Linux Spot Minimum cost"),
        makeColumnOption("cost-spot-max", "Linux Spot Average cost"),
        makeColumnOption("cost-ondemand-rhel", "RHEL On Demand cost"),
        makeColumnOption("cost-reserved-rhel", "RHEL Reserved cost"),
        makeColumnOption("cost-spot-min-rhel", "RHEL Spot Minimum cost"),
        makeColumnOption("cost-spot-max-rhel", "RHEL Spot Maximum cost"),
        makeColumnOption("cost-ondemand-sles", "SLES On Demand cost"),
        makeColumnOption("cost-reserved-sles", "SLES Reserved cost"),
        makeColumnOption("cost-spot-min-sles", "SLES Spot Minimum cost"),
        makeColumnOption("cost-spot-max-sles", "SLES Spot Maximum cost"),
        makeColumnOption("cost-ondemand-mswin", "Windows On Demand cost"),
        makeColumnOption("cost-reserved-mswin", "Windows Reserved cost"),
        makeColumnOption(
            "cost-spot-min-mswin",
            "Windows Spot Minimum cost",
        ),
        makeColumnOption(
            "cost-spot-max-mswin",
            "Windows Spot Average cost",
        ),
        makeColumnOption(
            "cost-ondemand-dedicated",
            "Dedicated Host On Demand",
        ),
        makeColumnOption(
            "cost-reserved-dedicated",
            "Dedicated Host Reserved",
        ),
        makeColumnOption(
            "cost-ondemand-mswinSQLWeb",
            "Windows SQL Web On Demand cost",
        ),
        makeColumnOption(
            "cost-reserved-mswinSQLWeb",
            "Windows SQL Web Reserved cost",
        ),
        makeColumnOption(
            "cost-ondemand-mswinSQL",
            "Windows SQL Std On Demand cost",
        ),
        makeColumnOption(
            "cost-reserved-mswinSQL",
            "Windows SQL Std Reserved cost",
        ),
        makeColumnOption(
            "cost-ondemand-mswinSQLEnterprise",
            "Windows SQL Ent On Demand cost",
        ),
        makeColumnOption(
            "cost-reserved-mswinSQLEnterprise",
            "Windows SQL Ent Reserved cost",
        ),
        makeColumnOption(
            "cost-ondemand-linuxSQLWeb",
            "Linux SQL Web On Demand cost",
        ),
        makeColumnOption(
            "cost-reserved-linuxSQLWeb",
            "Linux SQL Web Reserved cost",
        ),
        makeColumnOption(
            "cost-ondemand-linuxSQL",
            "Linux SQL Std On Demand cost",
        ),
        makeColumnOption(
            "cost-reserved-linuxSQL",
            "Linux SQL Std Reserved cost",
        ),
        makeColumnOption(
            "cost-ondemand-linuxSQLEnterprise",
            "Linux SQL Ent On Demand cost",
        ),
        makeColumnOption(
            "cost-reserved-linuxSQLEnterprise",
            "Linux SQL Ent Reserved cost",
        ),
        makeColumnOption(
            "spot-interrupt-rate",
            "Linux Spot Interrupt Frequency",
        ),
        makeColumnOption("cost-emr", "EMR cost"),
        makeColumnOption("generation", "Generation"),
    ];
}
