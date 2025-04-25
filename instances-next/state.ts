import { atom } from "atomtree";
import {
    initialColumnsValue,
    ColumnVisibility,
} from "./utils/columnVisibility";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import GSettings from "@/utils/g_settings_port";
import { safeParse } from "valibot";
import { makeColumnVisibilitySchema } from "./utils/columnVisibility";
import { RowSelectionState } from "@tanstack/react-table";
import { Instance } from "./types";
import handleCompressedFile from "./utils/handleCompressedFile";

const preloadedValues: {
    [path: string]: {
        value: Instance[];
        addChangeNotifier: (fn: () => void) => () => void;
    };
} = {};

export function useInstanceData(path: string, initialInstances: Instance[]) {
    return useSyncExternalStore(
        (onStoreChange) => {
            let p = preloadedValues[path];
            if (!p) {
                p = handleCompressedFile(path, initialInstances);
                preloadedValues[path] = p;
            }
            const unregister = p.addChangeNotifier(onStoreChange);
            return unregister;
        },
        () => preloadedValues[path].value,
        () => initialInstances,
    );
}

export const rowSelectionAtom = atom<RowSelectionState>({});

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

function createColumnVisibilityAtom() {
    const atomRes = atom({ ...initialColumnsValue });

    const localStorageValue =
        typeof window !== "undefined"
            ? localStorage.getItem("columnVisibility")
            : null;
    if (localStorageValue) {
        const res = safeParse(
            makeColumnVisibilitySchema(),
            JSON.parse(localStorageValue),
        );
        if (res.success) {
            atomRes.set(res.output);
        }
    }

    return {
        ...atomRes,
        set: (newValue: ColumnVisibility) => {
            localStorage.setItem("columnVisibility", JSON.stringify(newValue));
            atomRes.set(newValue);
        },
        mutate: (fn: (value: ColumnVisibility) => void) => {
            atomRes.mutate((value) => {
                fn(value);
                localStorage.setItem("columnVisibility", JSON.stringify(value));
            });
        },
    };
}

export const columnVisibilityAtom = createColumnVisibilityAtom();

let gSettingsHolder: [GSettings | undefined, number] = [undefined, 0];

const gSettingsEvent: Map<string, Set<() => void>> = new Map();

function useGSettingsValue<Key extends keyof GSettings>(
    key: Key,
    defaultValue: GSettings[Key],
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
    const pathname = usePathname();

    const fireEvents = (key: string) => {
        const s = gSettingsEvent.get(key);
        if (s) {
            for (const fn of s) {
                fn();
            }
        }
    };

    useEffect(() => {
        const expectedKey = pathname.split("?")[0].includes("azure")
            ? "azure_settings"
            : "aws_settings";
        if (!gSettingsHolder[0] || gSettingsHolder[0].key !== expectedKey) {
            const gSettings = new GSettings(expectedKey === "azure_settings");
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
    return useGSettingsValue("region", "us-east-1");
}

export function usePricingUnit() {
    return useGSettingsValue("pricingUnit", "instance");
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
