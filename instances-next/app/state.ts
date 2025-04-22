import { atom } from "atomtree";
import { initialColumnsValue, ColumnVisibility } from "./columnVisibility";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import GSettings from "@/utils/g_settings_port";
import { safeParse } from "valibot";
import { makeColumnVisibilitySchema } from "./columnVisibility";

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

    const localStorageValue = typeof window !== 'undefined' ? localStorage.getItem('columnVisibility') : null;
    if (localStorageValue) {
        const res = safeParse(makeColumnVisibilitySchema(), JSON.parse(localStorageValue));
        if (res.success) {
            atomRes.set(res.output);
        }
    }

    return {
        ...atomRes,
        set: (newValue: ColumnVisibility) => {
            localStorage.setItem('columnVisibility', JSON.stringify(newValue));
            atomRes.set(newValue);
        },
        mutate: (fn: (value: ColumnVisibility) => void) => {
            atomRes.mutate((value) => {
                fn(value);
                localStorage.setItem('columnVisibility', JSON.stringify(value));
            });
        },
    };
}

export const columnVisibilityAtom = createColumnVisibilityAtom();

let gSettings: GSettings | undefined;

const gSettingsEvent: Map<string, Set<() => void>> = new Map();

function useGSettingsValue<Key extends keyof GSettings>(key: Key, defaultValue: GSettings[Key]) {
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
            return gSettings?.[key] ?? defaultValue;
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
        const expectedKey = pathname.split("?")[0].includes('azure') ? 'azure_settings' : 'aws_settings';
        if (!gSettings || gSettings.key !== expectedKey) {
            gSettings = new GSettings(expectedKey === 'azure_settings');
            for (const value of gSettingsEvent.values()) {
                for (const fn of value) {
                    fn();
                }
            }
        }
    }, [pathname]);

    return [value, (newValue: GSettings[Key]) => {
        gSettings![key] = newValue;
        fireEvents(key);
    }] as const;
}

export function useSearchTerm() {
    return useGSettingsValue('filter', '');
}

export function useSelectedRegion() {
    return useGSettingsValue('region', 'us-east-1');
}

export function usePricingUnit() {
    return useGSettingsValue('pricingUnit', 'instance');
}

export function useDuration() {
    return useGSettingsValue('costDuration', 'hourly');
}

export function useReservedTerm() {
    return useGSettingsValue('reservedTerm', 'yrTerm1Standard.noUpfront');
}

export function clearGSettings() {
    if (gSettings) {
        gSettings.clear();
    }
    for (const value of gSettingsEvent.values()) {
        for (const fn of value) {
            fn();
        }
    }
}
