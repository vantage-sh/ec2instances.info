import { EC2Instance } from "@/types";

function findNearestInstanceMutatesNoCleanup(instances: EC2Instance[], closestTo: EC2Instance) {
    instances.push(closestTo);
    instances.sort((a, b) => {
        // Sort by CPU, memory, and then GPU.
        if (a.vCPU !== b.vCPU) {
            return a.vCPU - b.vCPU;
        }
        if (a.memory !== b.memory) {
            return a.memory - b.memory;
        }
        return (a.GPU || 0) - (b.GPU || 0);
    });
    const ourInstance = instances.indexOf(closestTo);
    const left = instances[ourInstance - 1];
    const right = instances[ourInstance + 1];
    if (left && right) {
        // Try and find one equality here with the closest instance.
        if (left.vCPU === closestTo.vCPU || left.memory === closestTo.memory || (left.GPU || 0) === (closestTo.GPU || 0)) {
            return left;
        }
        if (right.vCPU === closestTo.vCPU || right.memory === closestTo.memory || (right.GPU || 0) === (closestTo.GPU || 0)) {
            return right;
        }

        // If this isn't possible, return the best of the two.
        return left.vCPU === right.vCPU && left.memory === right.memory ? left : right;
    }
    return left || right;
}

export default function bestEc2InstanceForEachVariant(instances: EC2Instance[], closestTo: EC2Instance, instanceSplit: (instance: EC2Instance) => string) {
    const variants: Map<string, EC2Instance | EC2Instance[]> = new Map();
    for (const instance of instances) {
        const itype = instanceSplit(instance);
        let a = variants.get(itype);
        if (!a) {
            a = [];
            variants.set(itype, a);
        }
        (a as EC2Instance[]).push(instance);
    }

    for (const [itype, instances] of variants.entries()) {
        if ((instances as EC2Instance[]).includes(closestTo)) {
            variants.set(itype, closestTo);
        }
        const best = findNearestInstanceMutatesNoCleanup(instances as EC2Instance[], closestTo);
        variants.set(itype, best);
    }

    const o: { [key: string]: string } = {};
    for (const [itype, instance] of variants.entries()) {
        o[itype] = (instance as EC2Instance).instance_type;
    }
    return o;
}
