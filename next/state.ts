import { useEffect, useSyncExternalStore } from "react";
import handleCompressedFile from "./utils/handleCompressedFile";
import { CostDuration, PricingUnit } from "./types";
import { useGlobalStateValue } from "./utils/useGlobalStateValue";

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
