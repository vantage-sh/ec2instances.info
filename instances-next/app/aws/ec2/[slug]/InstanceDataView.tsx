import { Instance } from "@/types";
import { Info } from "lucide-react";

const RED: string[] = ["0", "n/a", "no", "none", "false", "off", "unavailable", "error", "unknown", "unsupported", "unsupported"];


function BGStyled({ content }: { content: any }) {
    if (typeof content === "string" && content.toLowerCase() === "current") {
        return (
            <div className="py-0.5 px-1 w-max font-bold font-mono rounded-md bg-purple-100 border border-purple-300">
                current
            </div>
        );
    }

    const j = typeof content === "string" ? content : JSON.stringify(content);
    const danger = RED.includes(j.toLowerCase());

    return (
        <div className={`py-0.5 px-1 w-max font-bold font-mono rounded-md ${danger ? "bg-red-100 border border-red-300" : "bg-green-100 border border-green-300"}`}>
            {j}
        </div>
    );
}

type TableProps = {
    slug: string;
    name: string;
    children: React.ReactNode;
}

function Table({ slug, name, children }: TableProps) {
    return (
        <table id={slug} className="mt-4 w-full text-sm p-2 border-collapse border border-gray-200 rounded-md">
            <thead>
                <tr className="bg-gray-100">
                    <th className="text-left p-1 border-gray-200">
                        <a href={`#${slug}`} className="text-purple-1 hover:text-purple-0">{name}</a>
                    </th>
                    <th className="text-left p-1 border-l border-gray-200">
                        Value
                    </th>
                </tr>
            </thead>
            <tbody>
                {children}
            </tbody>
        </table>
    );
}

type RowProps = {
    name: string;
    children: React.ReactNode;
    help?: string;
    helpText?: string;
}

function Row({ name, children, help, helpText }: RowProps) {
    return (
        <tr>
            <td className="p-1 border border-gray-200">{name}{help && (
                <span>{" "}<a target="_blank" href={help} className="text-purple-1 hover:text-purple-0">({helpText || "?"})</a></span>
            )}</td>
            <td className="p-1 border border-gray-200">{children}</td>
        </tr>
    );
}

function round(value: number) {
    return Math.round(value * 100) / 100;
}

export default function InstanceDataView({ instance }: { instance: Omit<Instance, "pricing"> }) {
    return (
        <article>
            <h2 className="font-bold flex items-center gap-2"><Info className="w-4 h-4" />Instance Details</h2>

            <Table slug="Compute" name="Compute">
                <Row name="vCPUs" children={instance.vCPU} />
                <Row name="Memory (GiB)" children={instance.memory} />
                <Row name="Memory per vCPU (GiB)" children={round(instance.memory / instance.vCPU)} />
                <Row name="Physical Processor" children={instance.physical_processor || "N/A"} />
                <Row name="Clock Speed (GHz)" children={instance.clock_speed_ghz || "N/A"} />
                <Row name="CPU Architecture" children={instance.arch[0] || "N/A"} />
                <Row name="GPU">
                    <BGStyled content={instance.GPU ?? "N/A"} />
                </Row>
                <Row name="GPU Architecture">
                    <BGStyled content={instance.GPU_model ?? "none"} />
                </Row>
                <Row name="Video Memory (GiB)" children={instance.GPU_memory || "0"} />
                <Row name="GPU Compute Capability" help="https://handbook.vantage.sh/aws/reference/aws-gpu-instances/">
                    {instance.compute_capability || "0"}
                </Row>
                <Row name="FPGA">
                    <BGStyled content={instance.FPGA ?? "0"} />
                </Row>
            </Table>

            <Table slug="Networking" name="Networking">
                <Row name="Network Performance (Gibps)" children={instance.network_performance.toLowerCase().replace("gigabit", "").trim()} />
                <Row name="Enhanced Networking">
                    <BGStyled content={instance.enhanced_networking} />
                </Row>
                <Row name="IPv6">
                    <BGStyled content={instance.ipv6_support} />
                </Row>
                <Row name="Placement Group" help="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html">
                    <BGStyled content={instance.placement_group_support} />
                </Row>
            </Table>

            <Table slug="Storage" name="Storage">
                <Row name="EBS Optimized">
                    <BGStyled content={instance.ebs_as_nvme} />
                </Row>
                <Row name="Max Bandwidth (Mbps) on" helpText="EBS" help="https://handbook.vantage.sh/aws/services/ebs-pricing/">
                    {instance.ebs_max_bandwidth}
                </Row>
                <Row name="Max Throughput (MB/s) on" helpText="EBS" help="https://handbook.vantage.sh/aws/services/ebs-pricing/">
                    {instance.ebs_throughput}
                </Row>
                <Row name="Max I/O operations/second" helpText="IOPS" help="https://handbook.vantage.sh/aws/concepts/io-operations/">
                    {instance.ebs_iops}
                </Row>
                <Row name="Baseline Bandwidth (Mbps) on" helpText="EBS" help="https://handbook.vantage.sh/aws/services/ebs-pricing/">
                    {instance.ebs_baseline_bandwidth}
                </Row>
                <Row name="Baseline Throughput (MB/s) on" helpText="EBS" help="https://handbook.vantage.sh/aws/services/ebs-pricing/">
                    {instance.ebs_baseline_throughput}
                </Row>
                <Row name="Baseline I/O operations/second" helpText="IOPS" help="https://handbook.vantage.sh/aws/concepts/io-operations/">
                    {instance.ebs_baseline_iops}
                </Row>
                <Row name="Devices" children={instance.storage?.devices || "0"} />
                <Row name="Swap Partition">
                    <BGStyled content={instance.storage?.includes_swap_partition ?? false} />
                </Row>
                <Row name="NVME Drive" help="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html#ec2-nitro-instances">
                    <BGStyled content={instance.storage?.nvme_ssd ?? false} />
                </Row>
                <Row name="Disk Space (GiB)" children={instance.storage?.size || "0"} />
                <Row name="SSD">
                    <BGStyled content={instance.storage?.ssd ?? false} />
                </Row>
                <Row name="Initialize Storage">
                    <BGStyled content={instance.storage?.storage_needs_initialization ?? false} />
                </Row>
            </Table>

            <Table slug="Amazon" name="Amazon">
                <Row name="Generation">
                    <BGStyled content={instance.generation} />
                </Row>
                <Row name="Instance Type" children={instance.instance_type} />
                <Row name="Name" children={instance.pretty_name} />
                <Row name="Elastic Map Reduce" helpText="EMR" help="https://handbook.vantage.sh/aws/services/emr-pricing/">
                    <BGStyled content={instance.emr} />
                </Row>
            </Table>
        </article>
    );
}
