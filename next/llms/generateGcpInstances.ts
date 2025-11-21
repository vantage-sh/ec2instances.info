import { markdownTable } from "markdown-table";
import { raw, urlInject } from "@/utils/urlInject";
import { gcpInstances } from "./loadedData";
import { GCPInstance } from "@/utils/colunnData/gcp";
import gcpTablesGenerator from "@/utils/gcpTablesGenerator";
import generateGcpDescription from "@/utils/generateGcpDescription";

const tableColumns = [
    ["", "OS"],
    ["ondemand", "On Demand"],
    ["spot", "Spot"],
] as const;

function fmtPrice(price: number | undefined) {
    if (price === undefined) return "N/A";
    return `$${price}/hr`;
}

const niceNames: Record<string, string> = {
    windows: "Windows",
    linux: "Linux",
};

function generateInstanceMarkdown(description: string, instance: GCPInstance) {
    const tables = gcpTablesGenerator(instance);

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
                return fmtPrice(
                    Number(instance.pricing[region]?.[platform]?.ondemand),
                );
            case "spot":
                return fmtPrice(
                    Number(instance.pricing[region]?.[platform]?.spot),
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

${regions.map((region) => urlInject`- [${raw(region)}](${`/gcp/${instance.instance_type}-${region}.md`})`).join("\n")}
`;

    return {
        root,
        regions: tableMdFrags,
    };
}

export default async function generateGcpInstances() {
    const instances = await gcpInstances;
    const instancesMarkdown = new Map<
        string,
        {
            root: string;
            regions: Map<string, string>;
        }
    >();
    for (const instance of instances) {
        const description = generateGcpDescription(instance);
        const data = generateInstanceMarkdown(description, instance);
        instancesMarkdown.set(instance.instance_type, data);
    }
    return instancesMarkdown;
}
