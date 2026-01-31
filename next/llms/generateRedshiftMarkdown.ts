import { Instance } from "@/utils/colunnData/redshift";
import generateRedshiftTables from "@/utils/generateRedshiftTables";
import generateHalfPricing from "./generateHalfPricing";
import { getTableName } from "@/utils/tableTranslations";

function generateDescription(instance: Instance, ondemandCost: string) {
    return `The ${instance.instance_type} instance is in the ${instance.family} family and it has ${instance.vcpu} vCPUs, ${instance.memory} GiB of memory starting at $${ondemandCost} per hour.`;
}

export default function generateRedshiftMarkdown(instance: Instance) {
    const regionRoot =
        instance.pricing["us-east-1"] ||
        instance.pricing[Object.keys(instance.pricing)[0]];
    const ondemandCost = regionRoot?.ondemand;

    const tableData = generateRedshiftTables(instance)
        .map(
            (t) => `## ${getTableName(t.nameKey)}

${t.rows.map((r) => `- ${getTableName(r.nameKey)}: ${r.children}`).join("\n")}
`,
        )
        .join("\n");

    return `# ${instance.instance_type}

> ${generateDescription(instance, ondemandCost)}

${tableData}
## Pricing

${generateHalfPricing(instance)}
`;
}
