import { Instance } from "@/utils/colunnData/sagemaker";
import generateSageMakerTables from "@/utils/generateSageMakerTables";
import generateHalfPricing from "./generateHalfPricing";

export default function generateSageMakerMarkdown(instance: Instance) {
    const regionRoot =
        instance.pricing["us-east-1"] ||
        instance.pricing[Object.keys(instance.pricing)[0]];
    const ondemandCost = regionRoot?.ondemand ?? "N/A";

    const tableData = generateSageMakerTables(instance)
        .map(
            (t) => `## ${t.name}

${t.rows.map((r) => `- ${r.name}: ${r.children}`).join("\n")}
`,
        )
        .join("\n");

    return `# ${instance.instance_type}

> The ${instance.instance_type} instance is in the ${instance.family} family and it has ${instance.vCPU} vCPUs, ${instance.memory} GiB of memory starting at $${ondemandCost} per hour.

${tableData}
## Pricing

${generateHalfPricing(instance)}
`;
}
