import { Instance } from "@/types";
import { awsInstances } from "./loadedData";
import generateDescription from "@/utils/generateDescription";
import { calculatePrice } from "./generateAwsIndexes";
import { generateAwsTables } from "@/utils/tablesGenerator";

function generateInstanceMarkdown(instance: Instance) {
    const tables = generateAwsTables(instance);

    const tableData = tables.map((table) => `## ${table.name}

${table.rows.map((row) => `- ${row.name}: ${row.children}`).join("\n")}
`).join("\n");

    return `# ${instance.instance_type}

> ${generateDescription(instance, calculatePrice(instance))}

${tableData}

## Pricing

TODO
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
