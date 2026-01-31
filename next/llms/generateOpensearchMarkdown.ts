import { Instance } from "@/utils/colunnData/opensearch";
import generateOpensearchTables from "@/utils/generateOpensearchTables";
import generateHalfPricing from "./generateHalfPricing";
import { getTableName } from "@/utils/tableTranslations";

function generateDescription(instance: Instance, ondemandCost: string) {
    return `The ${instance.instance_type} instance is in the ${instance.family} family and it has ${instance.vcpu} vCPUs, ${instance.memory} GiB of memory starting at $${ondemandCost} per hour.`;
}

export default function generateOpensearchMarkdown(instance: Instance) {
    const tableData = generateOpensearchTables(instance)
        .map(
            (t) => `## ${getTableName(t.nameKey)}

${t.rows.map((r) => `- ${getTableName(r.nameKey)}: ${r.children}`).join("\n")}
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
