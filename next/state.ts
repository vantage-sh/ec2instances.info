import { atom } from "atomtree";
import { useEffect, useSyncExternalStore } from "react";
import handleCompressedFile from "./utils/handleCompressedFile";
import { CostDuration, PricingUnit } from "./types";
import {
    useGlobalStateValue,
    useLastCurrencyLocalStorageValue,
} from "./utils/useGlobalStateValue";
import { browserBlockingLocalStorage } from "./utils/abGroup";
import type { CurrencyItem } from "./utils/loadCurrencies";

const preloadedValues: {
    [path: string]: {
        value: any[];
        addChangeNotifier: (fn: () => void) => () => void;
    };
} = {};

export const translationToolDetected = atom(false);

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

const activeTableDataFormatters: Set<() => Promise<string[][]>> = new Set();

export async function callActiveTableDataFormatter() {
    for (const fn of activeTableDataFormatters) {
        return await fn();
    }
    throw new Error("No table data formatter found");
}

export function useActiveTableDataFormatter(fn: () => Promise<string[][]>) {
    useEffect(() => {
        activeTableDataFormatters.add(fn);
        return () => {
            activeTableDataFormatters.delete(fn);
        };
    }, [activeTableDataFormatters]);
}

export function useSearchTerm(pathname: string) {
    return useGlobalStateValue("filter", pathname);
}

export function useSelectedRegion(pathname: string) {
    const defaultRegion = pathname.includes("azure") ? "us-east" : "us-east-1";

    return useGlobalStateValue("region", pathname, defaultRegion);
}

export function usePricingUnit(pathname: string, ecuRename?: string) {
    const [v, set] = useGlobalStateValue("pricingUnit", pathname, "instance");
    return [
        (v === ecuRename?.toLowerCase() ? "ecu" : v) as PricingUnit,
        (v: PricingUnit) => {
            if (v === "ecu" && ecuRename) {
                set(ecuRename.toLowerCase());
            } else {
                set(v);
            }
        },
    ] as const;
}

export function useDuration(pathname: string) {
    return useGlobalStateValue("costDuration", pathname, "hourly") as readonly [
        CostDuration,
        (value: CostDuration) => void,
    ];
}

export function useReservedTerm(pathname: string) {
    const defaultReservedTerm = pathname.includes("azure")
        ? "yrTerm1Standard.allUpfront"
        : "yrTerm1Standard.noUpfront";

    return useGlobalStateValue("reservedTerm", pathname, defaultReservedTerm);
}

export function useCompareOn(pathname: string) {
    return useGlobalStateValue("compareOn", pathname);
}

export function useColumnVisibility(pathname: string) {
    return useGlobalStateValue("visibleColumns", pathname);
}

export function useColumnFilters(pathname: string) {
    return useGlobalStateValue("columns", pathname);
}

export function useSorting(pathname: string) {
    return useGlobalStateValue("sort", pathname);
}

export function useSelected(pathname: string) {
    return useGlobalStateValue("selected", pathname);
}

export const currencyRateAtom = atom<{
    usd: number;
    cny: number;
}>({
    usd: 1,
    cny: 1,
});

export function useCurrency(pathname: string, currencies?: CurrencyItem[]) {
    const [v, set] = useGlobalStateValue("currency", pathname);
    const ls = useLastCurrencyLocalStorageValue();
    const valueWithFallback = v || ls || "USD";

    // Side affect to handle the currency rate when currencies are specified.
    useEffect(() => {
        if (!currencies) return;
        const currency = currencies.find((c) => c.code === valueWithFallback);
        if (currency) {
            // Set the currency rate
            currencyRateAtom.set({
                usd: currency.usdRate,
                cny: currency.cnyRate,
            });
        } else {
            // Default to USD
            set("USD");
        }
    }, [currencies, valueWithFallback]);

    return [
        valueWithFallback,
        (value: string | ((value: string) => string)) => {
            if (typeof value === "function") {
                set((old) => {
                    const sGet = () => {
                        if (browserBlockingLocalStorage) return "USD";
                        return localStorage.getItem("last_currency") || "USD";
                    };
                    const newVal = value(old || sGet());
                    return newVal;
                });
            } else {
                set(value);
            }
        },
    ] as const;
}
