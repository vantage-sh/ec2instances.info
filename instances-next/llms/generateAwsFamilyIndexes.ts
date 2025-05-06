import { Instance } from "@/types";
import { awsInstances } from "./loadedData";
import { generateIndexMarkdown } from "./generateAwsIndexes";

export default async function generateAwsFamilyIndexes() {
    const instances = await awsInstances;
    const instanceFamilyMap = new Map<string, Instance[]>();
    for (const instance of instances) {
        const family = instance.instance_type.split(".")[0];
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
