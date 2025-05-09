import { markdownTable } from "markdown-table";

type HalfPricing = {
    [region: string]: {
        ondemand: string;
        reserved?: {
            [term: string]: string;
        };
    };
};

const tableColumns = [
    ["ondemand", "On Demand"],
    ["yrTerm1Standard.noUpfront", "1yr No Upfront"],
    ["yrTerm1Standard.partialUpfront", "1yr Partial Upfront"],
    ["yrTerm1Standard.allUpfront", "1yr All Upfront"],
    ["yrTerm3Standard.noUpfront", "3yr No Upfront"],
    ["yrTerm3Standard.partialUpfront", "3yr Partial Upfront"],
    ["yrTerm3Standard.allUpfront", "3yr All Upfront"],
] as const;

export default function generateHalfPricing(instance: {
    pricing: HalfPricing;
}) {
    const rows: string[][] = [
        ["Region", ...tableColumns.map(([_, name]) => name)],
    ];
    for (const region in instance.pricing) {
        const row: string[] = [region];
        for (const column of tableColumns) {
            if (column[0] === "ondemand") {
                row.push(instance.pricing[region].ondemand);
            } else {
                const reserved = instance.pricing[region].reserved?.[column[0]];
                row.push(reserved ?? "N/A");
            }
        }
        rows.push(row);
    }
    return markdownTable(rows);
}
