import { CostDuration, PricingUnit } from "@/types";
import { Row } from "@tanstack/react-table";
import exprCompiler from "@/utils/expr";

const NOT_NUMBER_OR_DOT = /[^0-9.]/g;

function tryConv(value: string | number) {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const n = Number(value);
        if (isNaN(n)) {
            const s = value.split(" ")[0].replace(NOT_NUMBER_OR_DOT, "");
            const n2 = Number(s);
            if (!isNaN(n2)) return n2;
            return NaN;
        }
        return n;
    }
    return NaN;
}

const exprCache = new Map<string, (num: number, strValue: string) => boolean>();

function runCachedEval(expr: string, num: number, strValue: string) {
    const cached = exprCache.get(expr);
    if (cached) return cached(num, strValue);
    try {
        const e = exprCompiler(expr);
        const v = e(num, strValue);
        exprCache.set(expr, e);
        return v;
    } catch {
        // Just allow all if the expr is invalid.
        return true;
    }
}

export function expr(row: Row<any>, columnId: string, filterValue: string) {
    const value =
        row.original[columnId] ?? row.original[columnId.toLowerCase()];
    const conv = tryConv(value);
    if (isNaN(conv)) {
        return false;
    }
    return runCachedEval(filterValue, conv, value);
}

export function calculateCost(
    price: string | undefined,
    instance: any,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
) {
    if (!price) return "N/A";

    const hourMultipliers = {
        secondly: 1 / (60 * 60),
        minutely: 1 / 60,
        hourly: 1,
        daily: 24,
        weekly: 7 * 24,
        monthly: (365 * 24) / 12,
        annually: 365 * 24,
    };

    const durationMultiplier = hourMultipliers[costDuration];
    let pricingUnitModifier = 1;

    if (pricingUnit !== "instance") {
        pricingUnitModifier = Number(instance[pricingUnit]);
    }

    return `$${((Number(price) * durationMultiplier) / pricingUnitModifier).toFixed(4)} ${costDuration}`;
}

class RegexCacheWithTTL {
    private cache = new Map<string, RegExp>();

    get(key: string) {
        return this.cache.get(key);
    }

    set(key: string, value: RegExp) {
        this.cache.set(key, value);
        setTimeout(() => this.cache.delete(key), 10000);
    }
}

const regexCache = new RegexCacheWithTTL();

export function regex<Instance, Value>(opts: {
    accessorKey: keyof Instance;
    fallback?: (
        row: Row<Instance>,
        columnId: string,
        filterValue: Value,
    ) => boolean;
    getCell?: (row: Row<Instance>) => any;
}): (row: Row<Instance>, columnId: string, filterValue: Value) => boolean {
    let fallback = opts.fallback;
    if (!fallback) {
        fallback = (row, _, filterValue) => {
            const value = String(
                opts.getCell
                    ? opts.getCell(row)
                    : row.original[opts.accessorKey],
            );
            if (typeof value !== "string") return false;
            return value
                .toLowerCase()
                .includes(String(filterValue).toLowerCase());
        };
    }

    return (row, columnId, filterValue) => {
        const value = String(
            opts.getCell ? opts.getCell(row) : row.original[opts.accessorKey],
        );
        try {
            let regex = regexCache.get(String(filterValue));
            if (!regex) {
                regex = new RegExp(String(filterValue), "ig");
                regexCache.set(String(filterValue), regex);
            }
            if (regex.test(value)) return true;
        } catch {}
        return fallback(row, columnId, filterValue);
    };
}

export function makeCellWithRegexSorter<Instance>(
    accessorKey: keyof Instance,
    cellGet: (cell: { getValue: () => any; row: Row<Instance> }) => any,
): {
    cell: (info: { getValue: () => any; row: Row<Instance> }) => any;
    filterFn: (
        row: Row<Instance>,
        columnId: string,
        filterValue: string,
    ) => boolean;
} {
    return {
        cell: cellGet,
        filterFn: regex({
            accessorKey,
            getCell: (row) =>
                cellGet({
                    getValue: () => row.original[accessorKey],
                    row,
                }),
        }),
    };
}
