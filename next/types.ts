export interface PlatformPricing {
    ondemand: string;
    reserved?: {
        [term: string]: string;
    };
    spot_min?: string;
    spot_avg?: string;
    spot_max?: string;
    pct_interrupt?: string;
    emr?: string;
}

export interface Pricing {
    [region: string]: {
        [platform: string]: PlatformPricing;
    };
}

export interface EC2Instance {
    instance_type: string;
    family: string;
    pretty_name: string;
    memory: number;
    vCPU: number;
    ECU: number | "variable";
    base_performance?: number;
    burst_minutes?: number;
    memory_per_vcpu: number | "unknown";
    GPU?: number;
    GPU_model?: string;
    GPU_memory?: number;
    compute_capability?: string;
    FPGA?: number;
    ECU_per_vcpu: number | "unknown";
    physical_processor?: string;
    clock_speed_ghz?: string;
    intel_avx: boolean;
    intel_avx2: boolean;
    intel_avx512: boolean;
    intel_turbo: boolean;
    storage?: {
        devices: number;
        size: number;
        size_unit: string;
        nvme_ssd: boolean;
        ssd: boolean;
        includes_swap_partition: boolean;
        storage_needs_initialization: boolean;
        trim_support: boolean;
    };
    arch: string[];
    network_performance: string;
    network_sort: number;
    ebs_baseline_bandwidth?: number;
    ebs_baseline_throughput: number;
    ebs_baseline_iops: number;
    ebs_max_bandwidth?: number;
    ebs_throughput: number;
    ebs_optimized: boolean;
    ebs_iops: number;
    ebs_as_nvme: boolean;
    vpc?: {
        max_enis: number;
        ips_per_eni: number;
    };
    enhanced_networking: boolean;
    vpc_only: boolean;
    ipv6_support: boolean;
    placement_group_support: boolean;
    linux_virtualization_types?: string[];
    emr: boolean;
    availability_zones?: {
        [region: string]: string[];
    };
    pricing: Pricing;
    generation: string;
}

export interface Region {
    main: {
        [key: string]: string;
    };
    local_zone: {
        [key: string]: string;
    };
    wavelength: {
        [key: string]: string;
    };
}

export type PricingUnit = "instance" | "vcpu" | "ecu" | "memory";

export type CostDuration =
    | "secondly"
    | "minutely"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "annually";
