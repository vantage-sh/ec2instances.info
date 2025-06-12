import { EC2Instance } from "@/types";

export default function addRenderInfo(instance: EC2Instance) {
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
