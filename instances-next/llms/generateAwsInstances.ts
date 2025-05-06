import { Instance } from "@/types";
import { awsInstances } from "./loadedData";
import generateDescription from "@/utils/generateDescription";
import { calculatePrice } from "./generateAwsIndexes";

function generateInstanceMarkdown(instance: Instance) {
    return `# ${instance.instance_type}

> ${generateDescription(instance, calculatePrice(instance))}
 
Hello World!
`;
}

export default async function generateAwsInstances() {
    const instances = await awsInstances;
    const instancesMarkdown = new Map<string, string>();
    for (const instance of instances) {
        const markdown = generateInstanceMarkdown(instance);
        instancesMarkdown.set(instance.instance_type, markdown);
    }
    return instancesMarkdown;
}
