import { Instance } from "@/utils/colunnData/redshift";
import generateRedshiftTables from "@/utils/generateRedshiftTables";
import generateHalfPricing from "./generateHalfPricing";

function generateDescription(instance: Instance, ondemandCost: string) {
    return `The ${instance.instance_type} instance is in the ${instance.family} family and it has ${instance.vcpu} vCPUs, ${instance.memory} GiB of memory starting at $${ondemandCost} per hour.`;
}

export default function generateRedshiftMarkdown(instance: Instance) {
    const tableData = generateRedshiftTables(instance)
        .map(
            (t) => `## ${t.name}

${t.rows.map((r) => `- ${r.name}: ${r.children}`).join("\n")}
`,
        )
        .join("\n");

    return `# ${instance.instance_type}

> ${generateDescription(instance, instance.pricing["us-east-1"]?.ondemand)}

${tableData}
## Pricing

${generateHalfPricing(instance)}
`;
}
