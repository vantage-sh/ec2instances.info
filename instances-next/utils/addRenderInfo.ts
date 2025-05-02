import { Instance } from "@/types";

function networkSort(instance: Instance) {
    const perf = instance.network_performance;
    const network_rank = [
        "Very Low",
        "Low",
        "Low to Moderate",
        "Moderate",
        "High",
        "Up to 5 Gigabit",
        "Up to 10 Gigabit",
        "10 Gigabit",
        "12 Gigabit",
        "20 Gigabit",
        "Up to 25 Gigabit",
        "25 Gigabit",
        "50 Gigabit",
        "75 Gigabit",
        "100 Gigabit",
    ];
    try {
        const sort = network_rank.indexOf(perf);
        return sort * 2;
    } catch {
        return network_rank.length * 2;
    }
}

function addCpuDetail(instance: Instance) {
    if (typeof instance.ECU === "number" && typeof instance.vCPU === "number") {
        instance.ECU_per_vcpu = instance.ECU / instance.vCPU;
    } else {
        instance.ECU_per_vcpu = "unknown";
    }
    if (typeof instance.vCPU === "number") {
        instance.memory_per_vcpu =
            Math.round((instance.memory / instance.vCPU) * 100) / 100;
    } else {
        instance.memory_per_vcpu = "unknown";
    }
    if (instance.physical_processor) {
        instance.physical_processor = instance.physical_processor.replace(
            "*",
            "",
        );
    }
}

export default function addRenderInfo(instance: Instance) {
    try {
        instance.network_sort = networkSort(instance);
    } catch {}
    addCpuDetail(instance);
}
