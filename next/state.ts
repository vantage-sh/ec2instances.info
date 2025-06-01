import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
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

export function useSearchTerm() {
    return useGlobalStateValue("filter", "");
}

export function useSelectedRegion() {
    const pathname = usePathname();
    const defaultRegion = pathname.includes("azure") ? "us-east" : "us-east-1";

    return useGlobalStateValue("region", defaultRegion, pathname);
}

export function usePricingUnit(ecuRename?: string) {
    const [v, set] = useGlobalStateValue("pricingUnit", "instance");
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

export function useDuration() {
    return useGlobalStateValue("costDuration", "hourly") as readonly [
        CostDuration,
        (value: CostDuration) => void,
    ];
}

export function useReservedTerm() {
    const pathname = usePathname();
    const defaultReservedTerm = pathname.includes("azure")
        ? "yrTerm1Standard.allUpfront"
        : "yrTerm1Standard.noUpfront";

    return useGlobalStateValue("reservedTerm", defaultReservedTerm, pathname);
}

export function useCompareOn() {
    return useGlobalStateValue("compareOn", false);
}

export function useColumnVisibility() {
    return useGlobalStateValue("visibleColumns", {});
}

export function useColumnFilters() {
    return useGlobalStateValue("columns", []);
}

export function useSorting() {
    return useGlobalStateValue("sort", []);
}

export function useSelected() {
    return useGlobalStateValue("selected", []);
}
