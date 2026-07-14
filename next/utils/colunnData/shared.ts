import { CostDuration, CostPerGb, PricingUnit } from "@/types";
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
    if (cached) {
        try {
            return cached(num, strValue);
        } catch {
            // If a cached expression throws at runtime, treat it as invalid.
            exprCache.delete(expr);
            return true;
        }
    }
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
    const conv =
        typeof value === "number" || typeof value === "string"
            ? tryConv(value)
            : NaN;
    const strValue = value === undefined || value === null ? "" : String(value);
    return runCachedEval(filterValue, conv, strValue);
}

const hourMultipliers = {
    secondly: 1 / (60 * 60),
    minutely: 1 / 60,
    hourly: 1,
    daily: 24,
    weekly: 7 * 24,
    monthly: (365 * 24) / 12,
    annually: 365 * 24,
};

export function calculateCostNumeric(
    price: string | undefined,
    instance: any,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    selectedRegion: string,
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
    storageHourlyAddon: number = 0,
): number | undefined {
    if (!price) return undefined;

    const durationMultiplier = hourMultipliers[costDuration];
    let pricingUnitModifier = 1;

    if (pricingUnit !== "instance") {
        pricingUnitModifier = Number(instance[pricingUnit]);
        if (!pricingUnitModifier) return undefined;
    }

    const currencyMultiplier = selectedRegion.startsWith("cn-")
        ? currency.cnyRate
        : currency.usdRate;

    const hourlyTotal = Number(price) + storageHourlyAddon;
    return (
        ((hourlyTotal * durationMultiplier) / pricingUnitModifier) *
        currencyMultiplier
    );
}

// Resolves a number-or-platform-map value to a single number. For
// platform maps with multiple values we take the minimum (cheapest case)
// since the storage cost is folded into a service-wide pricing column
// and not tied to a specific engine/platform selector. Returns 0 for
// absent values.
function resolveCostPerGbValue(
    value: number | { [platform: string]: number } | undefined,
): number {
    if (value === undefined) return 0;
    if (typeof value === "number") return value;
    let min = Infinity;
    for (const k in value) {
        if (value[k] < min) min = value[k];
    }
    return min === Infinity ? 0 : min;
}

// getStorageHourlyAddon returns the per-instance storage cost in USD
// per hour to add on top of the compute price. Returns 0 when storage
// is at or below baseline (no extra cost) or when no overage rate exists.
//
// AWS publishes storage rates as USD per GB-month; we convert to per-hour
// so the value can be added to the existing per-hour compute price and
// flow through the existing duration / currency math.
export function getStorageHourlyAddon(
    costPerGb: CostPerGb | undefined,
    requestedGb: number,
    selectedRegion: string,
): number {
    if (!costPerGb || requestedGb <= 0) return 0;
    const baseline = resolveCostPerGbValue(costPerGb.baseline);
    const rate = resolveCostPerGbValue(costPerGb.regions?.[selectedRegion]);
    const extraGb = Math.max(0, requestedGb - baseline);
    if (extraGb === 0 || rate === 0) return 0;
    const monthHours = (365 * 24) / 12;
    return (extraGb * rate) / monthHours;
}

export function calculateCost(
    price: string | undefined,
    instance: any,
    pricingUnit: PricingUnit,
    costDuration: CostDuration,
    selectedRegion: string,
    currency: {
        code: string;
        usdRate: number;
        cnyRate: number;
    },
    storageHourlyAddon: number = 0,
) {
    if (!price) return "N/A";

    const perTime = calculateCostNumeric(
        price,
        instance,
        pricingUnit,
        costDuration,
        selectedRegion,
        currency,
        storageHourlyAddon,
    );
    if (perTime === undefined) return "N/A";

    const currencyData = Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.code,
        maximumFractionDigits: 4,
    }).format(perTime);

    return `${currencyData} ${costDuration}`;
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

            // Wow, JavaScript can surprise you everyday.
            regex.lastIndex = 0;
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

export function transformAllDataTables(
    values: readonly (readonly [string, boolean])[],
    dataTablesData: any,
) {
    if (!Array.isArray(dataTablesData.columns)) {
        return null;
    }
    const newMapping: Record<string, boolean> = {};
    const columns = dataTablesData.columns;
    for (let i = 0; i < columns.length; i++) {
        const visible = columns[i].visible;
        const [key, ourDefault] = values[i];
        if (visible !== ourDefault) {
            newMapping[key] = visible;
        }
    }
    return newMapping;
}
