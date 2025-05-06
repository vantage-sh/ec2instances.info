import { Instance } from "@/types";

const LOW_MEDIUM_HIGH = /(low|moderate|high)/gi;

export default function generateDescription(instance: Instance, ondemandCost: string) {
    let bw = "";
    if (instance.network_performance.match(LOW_MEDIUM_HIGH)) {
        bw = ` and ${instance.network_performance.toLowerCase()} network performance`;
    } else {
        bw = ` and ${instance.network_performance.toLowerCase().replace("gigabit", "").trim()} Gibps of bandwidth`;
    }
    return `The ${instance.instance_type} instance is in the ${instance.instance_type.split(".")[0]} family with ${instance.vCPU} vCPUs, ${instance.memory} GiB of memory${bw} starting at $${ondemandCost} per hour.`;
}
