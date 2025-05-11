import { generateIndexMarkdown } from "./generateAzureIndexes";
import type { AzureInstance } from "@/utils/colunnData/azure";
import { azureInstances } from "./loadedData";

export default async function generateAzureFamilyIndexes(pathPrefix: string) {
    const instances = await azureInstances;
    const instanceFamilyMap = new Map<string, AzureInstance[]>();
    for (const instance of instances) {
        const family = instance.instance_type.substring(0, 2);
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
