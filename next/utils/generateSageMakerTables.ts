import { Table } from "./ec2TablesGenerator";
import { Instance } from "./colunnData/sagemaker";

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function generateSageMakerTables(instance: Instance): Table[] {
    const memory = Number(instance.memory);
    const vcpu = Number(instance.vCPU);
    const memoryPerVcpu =
        isNaN(memory) || isNaN(vcpu) || vcpu === 0
            ? "N/A"
            : round(memory / vcpu);

    return [
        {
            name: "Compute",
            slug: "Compute",
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
                    children: memoryPerVcpu,
                },
                {
                    name: "Network Performance",
                    children: instance.network_performance || "N/A",
                },
                {
                    name: "GPU",
                    children: instance.GPU ?? 0,
                    bgStyled: true,
                },
                {
                    name: "GPU Model",
                    children: instance.GPU_model ?? "none",
                    bgStyled: true,
                },
            ],
        },
        {
            name: "Storage",
            slug: "Storage",
            rows: [
                {
                    name: "Storage",
                    children: instance.storage || "EBS only",
                },
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
            name: "Amazon",
            slug: "Amazon",
            rows: [
                {
                    name: "Generation",
                    children:
                        instance.generation === "Yes" ? "current" : "previous",
                    bgStyled: true,
                },
                {
                    name: "Instance Type",
                    children: instance.instance_type,
                },
                {
                    name: "Family",
                    children: instance.family,
                },
                {
                    name: "Compute Family",
                    children: instance.compute_family,
                },
                {
                    name: "Name",
                    children: instance.pretty_name,
                },
            ],
        },
    ];
}
