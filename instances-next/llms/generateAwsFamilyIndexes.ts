import { Instance } from "@/types";
import { awsInstances } from "./loadedData";
import { raw } from "@/utils/urlInject";
import { urlInject } from "@/utils/urlInject";

function generateFamilyIndex(family: string, instances: Instance[]) {
    return `# ${family}

${instances.map((i) => urlInject`- **${raw(i.instance_type)}**
    - [HTML (with user UI)](${`/aws/ec2/${i.instance_type}`})
    - [Markdown (with pricing data)](${`/aws/ec2/${i.instance_type}.md`})`).join("\n")}
`;
}

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
        const index = generateFamilyIndex(family, instances);
        m.set(family, index);
    }
    return m;
}
