import { atom } from "atomtree";
import { initialColumnsValue, ColumnVisibility } from "./columnVisibility";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GSettings from "@/utils/g_settings_port";
import { safeParse } from "valibot";
import { makeColumnVisibilitySchema } from "./columnVisibility";

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

function useGSettingsValue<Key extends keyof GSettings>(key: Key, defaultValue: GSettings[Key]) {
    const [value, setValue] = useState(defaultValue);
    const pathname = usePathname();

    useEffect(() => {
        const expectedKey = pathname.split("?")[0].includes('azure') ? 'azure_settings' : 'aws_settings';
        if (!gSettings || gSettings.key !== expectedKey) {
            gSettings = new GSettings(expectedKey === 'azure_settings');
        }
        setValue(gSettings[key]);
    }, [pathname]);

    return [value, (newValue: GSettings[Key]) => {
        gSettings![key] = newValue;
        setValue(newValue);
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
