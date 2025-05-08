import { EC2Instance } from "@/types";
import { awsInstances } from "./loadedData";
import generateDescription from "@/utils/generateDescription";
import { calculatePrice } from "./generateAwsIndexes";
import { ec2 } from "@/utils/ec2TablesGenerator";
import { markdownTable } from "markdown-table";
import { raw, urlInject } from "@/utils/urlInject";

const tableColumns = [
    ["", "OS"],
    ["ondemand", "On Demand"],
    ["spot_min", "Spot Min"],
    ["spot_avg", "Spot Avg"],
    ["spot_max", "Spot Max"],
    ["yrTerm1Standard.noUpfront", "1yr No Upfront"],
    ["yrTerm1Standard.partialUpfront", "1yr Partial Upfront"],
    ["yrTerm1Standard.allUpfront", "1yr All Upfront"],
    ["yrTerm3Standard.noUpfront", "3yr No Upfront"],
    ["yrTerm3Standard.partialUpfront", "3yr Partial Upfront"],
    ["yrTerm3Standard.allUpfront", "3yr All Upfront"],
    ["yrTerm1Convertible.noUpfront", "1yr No Upfront (Convertible)"],
    ["yrTerm1Convertible.partialUpfront", "1yr Partial Upfront (Convertible)"],
    ["yrTerm1Convertible.allUpfront", "1yr All Upfront (Convertible)"],
    ["yrTerm3Convertible.noUpfront", "3yr No Upfront (Convertible)"],
    ["yrTerm3Convertible.partialUpfront", "3yr Partial Upfront (Convertible)"],
    ["yrTerm3Convertible.allUpfront", "3yr All Upfront (Convertible)"],
] as const;

function fmtPrice(price: string | undefined) {
    if (price === undefined) return "N/A";
    const n = Number(price);
    if (isNaN(n)) return "N/A";
    return `$${n}/hr`;
}

const niceNames: Record<string, string> = {
    dedicated: "Dedicated",
    ebs: "EBS",
    emr: "EMR",
    linux: "Linux",
    linuxSQL: "Linux SQL Server",
    linuxSQLEnterprise: "Linux SQL Enterprise",
    linuxSQLWeb: "Linux SQL Web",
    mswin: "Windows",
    mswinSQL: "Windows SQL Server",
    mswinSQLEnterprise: "Windows SQL Enterprise",
    mswinSQLWeb: "Windows SQL Web",
    rhel: "RHEL",
    rhelSQL: "RHEL SQL Server",
    rhelSQLEnterprise: "RHEL SQL Enterprise",
    rhelSQLWeb: "RHEL SQL Web",
    sles: "SLES",
    ubuntu: "Ubuntu",
    windows: "Windows",
};

function generateInstanceMarkdown(instance: EC2Instance) {
    const tables = ec2(instance);

    function renderData(region: string, platform: string, column: {
        [key in typeof tableColumns[number][0]]: key;
    }[typeof tableColumns[number][0]]): string {
        if (column === "") {
            return niceNames[platform] || platform;
        }
        switch (column) {
            case "ondemand":
            case "spot_avg":
            case "spot_min":
            case "spot_max":
                return fmtPrice(instance.pricing[region]?.[platform]?.[column]);
            case "yrTerm1Standard.noUpfront":
            case "yrTerm1Standard.partialUpfront":
            case "yrTerm1Standard.allUpfront":
            case "yrTerm3Standard.noUpfront":
            case "yrTerm3Standard.partialUpfront":
            case "yrTerm3Standard.allUpfront":
            case "yrTerm1Convertible.noUpfront":
            case "yrTerm1Convertible.partialUpfront":
            case "yrTerm1Convertible.allUpfront":
            case "yrTerm3Convertible.noUpfront":
            case "yrTerm3Convertible.partialUpfront":
            case "yrTerm3Convertible.allUpfront":
                return fmtPrice(instance.pricing[region]?.[platform]?.reserved?.[column]);
        }
    }

    const tableMdFrags: Map<string, string> = new Map();
    for (const [region, platforms] of Object.entries(instance.pricing)) {
        const columnWidths = new Map<string, number>();
        for (const col of tableColumns) {
            columnWidths.set(col[0], col[1].length);
        }
        const rows: string[][] = [
            tableColumns.map(([, columnName]) => columnName),
        ];

        const platformsSorted = Object.keys(platforms).sort((a, b) => a.localeCompare(b));
        for (const platform of platformsSorted) {
            const row = tableColumns.map(([column]) => renderData(region, platform, column));
            rows.push(row);
        }

        const tableMd = markdownTable(rows);
        tableMdFrags.set(region, tableMd);
    }

    const regions = Array.from(tableMdFrags.keys()).sort((a, b) => a.localeCompare(b));
    
    const tableData = tables.map((table) => `## ${table.name}

${table.rows.map((row) => `- ${row.name}: ${row.children}`).join("\n")}
`).join("\n");

    const root = `# ${instance.instance_type}

> ${generateDescription(instance, calculatePrice(instance))}

${tableData}

## Pricing Indexes

${regions.map((region) => urlInject`- [${raw(region)}](${`/aws/ec2/${instance.instance_type}-${region}.md`})`).join("\n")}
`;

    return {
        root,
        regions: tableMdFrags,
    };
}

export default async function generateAwsInstances() {
    const instances = await awsInstances;
    const instancesMarkdown = new Map<string, {
        root: string;
        regions: Map<string, string>;
    }>();
    for (const instance of instances) {
        const data = generateInstanceMarkdown(instance);
        instancesMarkdown.set(instance.instance_type, data);
    }
    return instancesMarkdown;
}
