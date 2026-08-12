import { Instance } from "@/utils/colunnData/sagemaker";
import { generateIndexMarkdown } from "./generateSageMakerIndexes";

export default async function generateSageMakerFamilyIndexes(
    instancesPromise: Promise<Instance[]>,
) {
    const instances = await instancesPromise;
    const instanceFamilyMap = new Map<string, Instance[]>();
    for (const instance of instances) {
        const [prefix, family] = instance.instance_type.split(".", 3);
        const familyKey = `${prefix}.${family}`;
        let familyInstances = instanceFamilyMap.get(familyKey);
        if (!familyInstances) {
            familyInstances = [];
            instanceFamilyMap.set(familyKey, familyInstances);
        }
        familyInstances.push(instance);
    }
    const m = new Map<string, string>();
    for (const [family, instances] of instanceFamilyMap.entries()) {
        const index = generateIndexMarkdown(family, instances);
        m.set(family, index);
    }
    return m;
}
