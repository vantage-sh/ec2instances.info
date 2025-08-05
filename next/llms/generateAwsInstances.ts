import { EC2Instance } from "@/types";
import { markdownTable } from "markdown-table";
import { raw, urlInject } from "@/utils/urlInject";
import { Table } from "@/utils/ec2TablesGenerator";

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

function fmtPrice(region: string, price: string | undefined) {
    if (price === undefined) return "N/A";
    const n = Number(price);
    if (isNaN(n)) return "N/A";

    const useCny =
        region.startsWith("cn-") || region.toLowerCase().includes("china");

    if (useCny) {
        return `¥${n}/hr`;
    }

    return `$${n}/hr`;
}

const niceNames: Record<string, string> = {
    // EC2
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

    // RDS
    PostgreSQL: "PostgreSQL",
    MySQL: "MySQL",
    Oracle: "Oracle",
    "SQL Server": "SQL Server",
    "21": "Aurora Postgres & MySQL",
    "211": "Aurora I/O Optimized",
    "403": "SQL Server Enterprise",
    "18": "MariaDB",
    "20": "Oracle Standard Two",
    "19": "Oracle Standard Two BYOL",
    "4": "Oracle Standard BYOL",
    "410": "Oracle Enterprise BYOL",
    "12": "SQL Server Standard",
    "10": "SQL Server Express",
    "3": "Oracle Standard One BYOL",
    "210": "MySQL (Outpost On-Prem)",
    "220": "PostgreSQL (Outpost On-Prem)",
    "230": "SQL Server Enterprise (Outpost On-Prem)",
    "231": "SQL Server (Outpost On-Prem)",
    "232": "SQL Server Web (Outpost On-Prem)",
    "405": "SQL Server Standard BYOM",
    "406": "SQL Server Enterprise BYOM",

    // ElastiCache
    Redis: "Redis",
    Memcached: "Memcached",
    Valkey: "Valkey",
};

function generateInstanceMarkdown(
    description: string,
    hideOs: boolean,
    pathPrefix: string,
    hideConvertible: boolean,
    instance: EC2Instance,
    generateTables: (instance: EC2Instance) => Table[],
) {
    const tables = generateTables(instance);

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
            case "spot_avg":
            case "spot_min":
            case "spot_max":
                return fmtPrice(
                    region,
                    instance.pricing[region]?.[platform]?.[column],
                );
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
                return fmtPrice(
                    region,
                    instance.pricing[region]?.[platform]?.reserved?.[column],
                );
        }
    }

    const tableMdFrags: Map<string, string> = new Map();
    for (const [region, platforms] of Object.entries(instance.pricing)) {
        const rows: string[][] = [
            tableColumns
                .map(([, columnName]) => columnName)
                .filter(
                    (column) =>
                        (!column.includes("Convertible") &&
                            !column.includes("Spot")) ||
                        !hideConvertible,
                ),
        ];

        const platformsSorted = Object.keys(platforms).sort((a, b) =>
            a.localeCompare(b),
        );
        for (const platform of platformsSorted) {
            if (hideOs && !niceNames[platform]) continue;
            const row = tableColumns
                .map(([column]) =>
                    (column.includes("Convertible") ||
                        column.includes("spot")) &&
                    hideConvertible
                        ? null
                        : renderData(region, platform, column),
                )
                .filter((r) => r !== null);
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

${regions.map((region) => urlInject`- [${raw(region)}](${`${pathPrefix}/${instance.instance_type}-${region}.md`})`).join("\n")}
`;

    return {
        root,
        regions: tableMdFrags,
    };
}

export default async function generateAwsInstances(
    generateDescription: (instance: EC2Instance) => string,
    hideOs: boolean,
    pathPrefix: string,
    hideConvertible: boolean,
    instancesPromise: Promise<EC2Instance[]>,
    generateTables: (instance: EC2Instance) => Table[],
) {
    const instances = await instancesPromise;
    const instancesMarkdown = new Map<
        string,
        {
            root: string;
            regions: Map<string, string>;
        }
    >();
    for (const instance of instances) {
        const data = generateInstanceMarkdown(
            generateDescription(instance),
            hideOs,
            pathPrefix,
            hideConvertible,
            instance,
            generateTables,
        );
        instancesMarkdown.set(instance.instance_type, data);
    }
    return instancesMarkdown;
}
