import { markdownTable } from "markdown-table";
import { raw, urlInject } from "@/utils/urlInject";
import { azureInstances } from "./loadedData";
import { AzureInstance } from "@/utils/colunnData/azure";
import azureTablesGenerator from "@/utils/azureTablesGenerator";
import generateAzureDescription from "@/utils/generateAzureDescription";

const tableColumns = [
    ["", "OS"],
    ["ondemand", "On Demand"],
    ["spot_min", "Spot Min"],
    ["yrTerm1Savings.allUpfront", "1yr Savings (All Upfront)"],
    ["yrTerm1Savings.hybridbenefit", "1yr Savings (Hybrid Benefit)"],
    ["yrTerm1Standard.allUpfront", "1yr Standard (All Upfront)"],
    ["yrTerm1Standard.hybridbenefit", "1yr Standard (Hybrid Benefit)"],
    ["yrTerm3Savings.allUpfront", "3yr Savings (All Upfront)"],
    ["yrTerm3Savings.hybridbenefit", "3yr Savings (Hybrid Benefit)"],
    ["yrTerm3Standard.allUpfront", "3yr Standard (All Upfront)"],
    ["yrTerm3Standard.hybridbenefit", "3yr Standard (Hybrid Benefit)"],
] as const;

function fmtPrice(price: number | undefined) {
    if (price === undefined) return "N/A";
    return `$${price}/hr`;
}

const niceNames: Record<string, string> = {
    windows: "Windows",
    linux: "Linux",
};

function generateInstanceMarkdown(
    description: string,
    instance: AzureInstance,
) {
    const tables = azureTablesGenerator(instance);

    function renderData(
        region: string,
        platform: string,
        column: {
            [key in (typeof tableColumns)[number][0]]: key;
        }[(typeof tableColumns)[number][0]],
    ): string {
        if (column === "") {
            return niceNames[platform] || platform;
        }
        switch (column) {
            case "ondemand":
            case "spot_min":
                return fmtPrice(instance.pricing[region]?.[platform]?.[column]);
            case "yrTerm1Savings.allUpfront":
            case "yrTerm1Savings.hybridbenefit":
            case "yrTerm1Standard.allUpfront":
            case "yrTerm1Standard.hybridbenefit":
            case "yrTerm3Savings.allUpfront":
            case "yrTerm3Savings.hybridbenefit":
            case "yrTerm3Standard.allUpfront":
            case "yrTerm3Standard.hybridbenefit":
                return fmtPrice(
                    instance.pricing[region]?.[platform]?.reserved?.[column],
                );
        }
    }

    const tableMdFrags: Map<string, string> = new Map();
    for (const [region, platforms] of Object.entries(instance.pricing)) {
        const rows: string[][] = [
            tableColumns.map(([, columnName]) => columnName),
        ];

        const platformsSorted = Object.keys(platforms).sort((a, b) =>
            a.localeCompare(b),
        );
        for (const platform of platformsSorted) {
            if (!niceNames[platform]) continue;
            const row = tableColumns.map(([column]) =>
                renderData(region, platform, column),
            );
            rows.push(row);
        }

        const tableMd = markdownTable(rows);
        tableMdFrags.set(region, tableMd);
    }

    const regions = Array.from(tableMdFrags.keys()).sort((a, b) =>
        a.localeCompare(b),
    );

    const tableData = tables
        .map(
            (table) => `## ${table.name}

${table.rows.map((row) => `- ${row.name}: ${row.children}`).join("\n")}
`,
        )
        .join("\n");

    const root = `# ${instance.instance_type}

> ${description}

${tableData}

## Pricing Indexes

${regions.map((region) => urlInject`- [${raw(region)}](${`/azure/vm/${instance.instance_type}-${region}.md`})`).join("\n")}
`;

    return {
        root,
        regions: tableMdFrags,
    };
}

export default async function generateAzureInstances() {
    const instances = await azureInstances;
    const instancesMarkdown = new Map<
        string,
        {
            root: string;
            regions: Map<string, string>;
        }
    >();
    for (const instance of instances) {
        const description = generateAzureDescription(instance);
        const data = generateInstanceMarkdown(description, instance);
        instancesMarkdown.set(instance.instance_type, data);
    }
    return instancesMarkdown;
}
