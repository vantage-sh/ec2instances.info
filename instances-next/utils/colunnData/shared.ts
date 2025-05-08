import { CostDuration, PricingUnit } from "@/types";
import { Row } from "@tanstack/react-table";
import {
    boolean,
    optional,
    object,
    OptionalSchema,
    BooleanSchema,
} from "valibot";

export function makeSchemaWithDefaults<T extends Record<string, boolean>>(
    initialColumnsValue: T,
) {
    const o: {
        [key in keyof T]: OptionalSchema<BooleanSchema<undefined>, boolean>;
    } = {} as any;
    for (const key in initialColumnsValue) {
        o[key as keyof T] = optional(
            boolean(),
            initialColumnsValue[key as keyof T],
        );
    }
    return object(o);
}

export function doAllDataTablesMigrations<
    ColumnsArray extends readonly (readonly [string, boolean])[],
>(
    path: string,
    initialColumnsArr: ColumnsArray,
    initialColumnsValue: {
        [key in ColumnsArray[number][0]]: boolean;
    },
) {
    const localStorageKey = `DataTables_data_${path}`;
    const localStorageValue = localStorage.getItem(localStorageKey);
    if (!localStorageValue) {
        return;
    }
    const m = new Map<string, boolean>();
    try {
        const dataTablesData = JSON.parse(localStorageValue);
        if (!Array.isArray(dataTablesData.columns)) {
            return;
        }
        const columns = dataTablesData.columns;
        for (let i = 0; i < columns.length; i++) {
            const visible = columns[i].visible;
            const [key, ourDefault] = initialColumnsArr[i];
            if (visible !== ourDefault) {
                m.set(key, visible);
            }
        }
        localStorage.removeItem(localStorageKey);
    } catch {
        // Data was invalid
        return;
    }
    if (m.size === 0) return;
    const cpy = { ...initialColumnsValue };
    for (const [key, value] of m.entries()) {
        // @ts-expect-error: close enough
        cpy[key as keyof InitialColumnsValue] = value;
    }
    return cpy;
}

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

export function gt(row: Row<any>, columnId: string, filterValue: number) {
    const value = row.original[columnId.toLowerCase()];
    const conv = tryConv(value);
    if (isNaN(conv)) {
        console.log(value, conv, columnId);
        return false;
    }
    return conv >= filterValue;
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
