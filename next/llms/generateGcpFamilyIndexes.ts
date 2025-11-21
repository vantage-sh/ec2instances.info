import { generateIndexMarkdown } from "./generateGcpIndexes";
import type { GCPInstance } from "@/utils/colunnData/gcp";
import { gcpInstances } from "./loadedData";

export default async function generateGcpFamilyIndexes(pathPrefix: string) {
    const instances = await gcpInstances;
    const instanceFamilyMap = new Map<string, GCPInstance[]>();
    for (const instance of instances) {
        const family = instance.family;
        let familyInstances = instanceFamilyMap.get(family);
        if (!familyInstances) {
            familyInstances = [];
            instanceFamilyMap.set(family, familyInstances);
        }
        familyInstances.push(instance);
    }
    const m = new Map<string, string>();
    for (const [family, instances] of instanceFamilyMap.entries()) {
        const index = generateIndexMarkdown(pathPrefix, family, instances);
        m.set(family, index);
    }
    return m;
}
