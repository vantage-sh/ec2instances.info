import { atom } from "atomtree";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import GSettings from "@/utils/g_settings_port";
import { safeParse } from "valibot";
import handleCompressedFile from "./utils/handleCompressedFile";
import * as columnData from "./utils/colunnData";
import { PricingUnit } from "./types";

const preloadedValues: {
    [path: string]: {
        value: any[];
        addChangeNotifier: (fn: () => void) => () => void;
    };
} = {};

export function useInstanceData<Instance>(
    path: string | null,
    initialInstances: Instance[],
) {
    return useSyncExternalStore(
        (onStoreChange) => {
            if (!path) return () => {};
            let p = preloadedValues[path];
            if (!p) {
                p = handleCompressedFile(path, initialInstances);
                preloadedValues[path] = p;
            }
            return p.addChangeNotifier(onStoreChange);
        },
        () => {
            if (!path) return initialInstances;
            let p = preloadedValues[path];
            if (!p) {
                p = handleCompressedFile(path, initialInstances);
                preloadedValues[path] = p;
            }
            return p.value as Instance[];
        },
        () => initialInstances,
    );
}

const exportEvents: Set<() => void> = new Set();

export function callExportEvents() {
    for (const fn of exportEvents) {
        fn();
    }
}

/** This is a bit hacky, but alas, the table is in one place. */
export function useHookToExportButton(hn: () => void) {
    useEffect(() => {
        exportEvents.add(hn);
        return () => {
            exportEvents.delete(hn);
        };
    }, []);
}

export type ColumnVisibility<Key extends keyof typeof columnData> =
    (typeof columnData)[Key]["initialColumnsValue"];

function createColumnVisibilityAtomForKey<Key extends keyof typeof columnData>(
    key: Key,
) {
    const v = columnData[key];
    const atomRes = atom({ ...v.initialColumnsValue });

    const localStorageValue =
        typeof window !== "undefined"
            ? localStorage.getItem(`columnVisibility_${key}`)
            : null;
    if (localStorageValue) {
        const res = safeParse(
            v.makeColumnVisibilitySchema(),
            JSON.parse(localStorageValue),
        );
        if (res.success) {
            atomRes.set(res.output);
        }
    }

    return {
        ...atomRes,
        set: (newValue: ColumnVisibility<Key>) => {
            localStorage.setItem(
                `columnVisibility_${key}`,
                JSON.stringify(newValue),
            );
            atomRes.set(newValue);
        },
        mutate: (fn: (value: ColumnVisibility<Key>) => void) => {
            atomRes.mutate((value) => {
                fn(value);
                localStorage.setItem(
                    `columnVisibility_${key}`,
                    JSON.stringify(value),
                );
            });
        },
    };
}

export const columnVisibilityAtoms: {
    [key in keyof typeof columnData]: ReturnType<
        typeof createColumnVisibilityAtomForKey<key>
    >;
} = {} as any;
for (const key in columnData) {
    // @ts-expect-error: TS doesn't understand this because its dynamic.
    columnVisibilityAtoms[key] = createColumnVisibilityAtomForKey(key);
}

let gSettingsHolder: [GSettings | undefined, number] = [undefined, 0];

const gSettingsEvent: Map<string, Set<() => void>> = new Map();

function useGSettingsValue<Key extends keyof GSettings>(
    key: Key,
    defaultValue: GSettings[Key],
    pathname?: string,
) {
    const value = useSyncExternalStore(
        (onStoreChange) => {
            let s = gSettingsEvent.get(key);
            if (!s) {
                s = new Set();
                gSettingsEvent.set(key, s);
            }
            s.add(onStoreChange);
            return () => {
                s.delete(onStoreChange);
            };
        },
        () => {
            return gSettingsHolder[0]?.[key] ?? defaultValue;
        },
        () => defaultValue,
    );
    if (!pathname) pathname = usePathname();

    const fireEvents = (key: string) => {
        const s = gSettingsEvent.get(key);
        if (s) {
            for (const fn of s) {
                fn();
            }
        }
    };

    useEffect(() => {
        const path = pathname.split("?")[0];
        const expectedKey = path.includes("azure")
            ? "azure_settings"
            : "ec2_settings";
        if (!gSettingsHolder[0] || gSettingsHolder[0].key !== expectedKey) {
            const gSettings = new GSettings(
                expectedKey === "azure_settings",
                path !== "/",
            );
            gSettingsHolder = [gSettings, gSettingsHolder[1] + 1];
            for (const value of gSettingsEvent.values()) {
                for (const fn of value) {
                    fn();
                }
            }
        }
    }, [pathname]);

    return [
        value,
        (newValue: GSettings[Key]) => {
            gSettingsHolder[0]![key] = newValue;
            fireEvents(key);
        },
    ] as const;
}

export function useSearchTerm() {
    return useGSettingsValue("filter", "");
}

export function useSelectedRegion() {
    const pathname = usePathname();
    const defaultRegion = pathname.includes("azure") ? "us-east" : "us-east-1";

    return useGSettingsValue("region", defaultRegion, pathname);
}

export function usePricingUnit(ecuRename?: string) {
    const [v, set] = useGSettingsValue("pricingUnit", "instance");
    return [v === ecuRename ? "ecu" : v, (v: PricingUnit) => {
        if (v === "ecu" && ecuRename) {
            // @ts-expect-error: This technically isn't spec compliant, but we catch it.
            set(ecuRename.toLowerCase());
        } else {
            set(v);
        }
    }] as const;
}

export function useDuration() {
    return useGSettingsValue("costDuration", "hourly");
}

export function useReservedTerm() {
    return useGSettingsValue("reservedTerm", "yrTerm1Standard.noUpfront");
}

export function useCompareOn() {
    const [v, set] = useGSettingsValue("compareOn", false);
    return [v, gSettingsHolder[0]?.filterPreCompareOn, set] as const;
}

const undefinedPtr: [GSettings | undefined, number] = [undefined, 0];

export function useGSettings() {
    return useSyncExternalStore(
        (onStoreChange) => {
            let s = gSettingsEvent.get(""); // Blank string since other effects fire all when gSettings changes
            if (!s) {
                s = new Set();
                gSettingsEvent.set("", s);
            }
            s.add(onStoreChange);
            return () => {
                s.delete(onStoreChange);
            };
        },
        () => gSettingsHolder,
        () => undefinedPtr,
    );
}

export function clearGSettings() {
    if (gSettingsHolder[0]) {
        gSettingsHolder[0].clear();
        gSettingsHolder = [gSettingsHolder[0], gSettingsHolder[1] + 1];
    }
    for (const value of gSettingsEvent.values()) {
        for (const fn of value) {
            fn();
        }
    }
}
