import { EC2Instance } from "@/types";
import { generateIndexMarkdown } from "./generateAwsIndexes";

export default async function generateAwsFamilyIndexes(pathPrefix: string, split: (s: string) => string, instancesPromise: Promise<EC2Instance[]>) {
    const instances = await instancesPromise;
    const instanceFamilyMap = new Map<string, EC2Instance[]>();
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
        const index = generateIndexMarkdown(pathPrefix, family, instances);
        m.set(family, index);
    }
    return m;
}
