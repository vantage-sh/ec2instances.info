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

function formatPrice(price: string | undefined, region: string) {
    if (!price) {
        return "N/A";
    }
    let n = Number(price);
    if (isNaN(n)) {
        return "N/A";
    }
    const useCny =
        region.startsWith("cn-") || region.toLowerCase().includes("china");
    n = Math.round(n * 10000) / 10000;
    if (useCny) {
        return `¥${n}/hr`;
    }
    return `$${n}/hr`;
}

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
                row.push(
                    formatPrice(instance.pricing[region].ondemand, region),
                );
            } else {
                const reserved = instance.pricing[region].reserved?.[column[0]];
                row.push(formatPrice(reserved, region));
            }
        }
        rows.push(row);
    }
    return markdownTable(rows);
}
