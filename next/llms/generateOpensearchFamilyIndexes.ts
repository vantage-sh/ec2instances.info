import { Instance } from "@/utils/colunnData/opensearch";
import { generateIndexMarkdown } from "./generateOpensearchIndexes";

function split(instanceType: string) {
    const instanceTypeParts = instanceType.split(".", 2);
    return instanceTypeParts[0];
}

export default async function generateOpensearchFamilyIndexes(instancesPromise: Promise<Instance[]>) {
    const instances = await instancesPromise;
    const instanceFamilyMap = new Map<string, Instance[]>();
    for (const instance of instances) {
        const family = split(instance.instance_type);
        let familyInstances = instanceFamilyMap.get(family);
        if (!familyInstances) {
            familyInstances = [];
            instanceFamilyMap.set(family, familyInstances);
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
