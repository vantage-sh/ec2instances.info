import { boolean, optional, object, OptionalSchema, BooleanSchema } from "valibot";

export function makeSchemaWithDefaults<T extends Record<string, boolean>>(initialColumnsValue: T) {
    const o: {
        [key in keyof T]: OptionalSchema<BooleanSchema<undefined>, boolean>;
    } = {} as any;
    for (const key in initialColumnsValue) {
        o[key as keyof T] = optional(boolean(), initialColumnsValue[key as keyof T]);
    }
    return object(o);
}

export function doAllDataTablesMigrations<
    ColumnsArray extends readonly (readonly [string, boolean])[],
>(path: string, initialColumnsArr: ColumnsArray, initialColumnsValue: {
    [key in ColumnsArray[number][0]]: boolean;
}) {
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
