import { useCallback, useSyncExternalStore } from "react";
import { get, write, StateDump } from "./instancesKvClient";

async function doWrite(
    [, data]: [
        Map<string, Set<() => void>>,
        StateDump | null,
        ReturnType<typeof setTimeout> | null,
    ],
    pathname: string,
) {
    if (!data) return;
    const id = await write(data);
    const url = new URL(window.location.href);
    if (url.pathname !== pathname) return;
    url.searchParams.set("id", id);
    window.history.replaceState({}, "", url.toString());
}

function getIdFromUrl() {
    if (typeof window === "undefined") return null;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return null;
    return decodeURIComponent(id);
}

async function doNetworkRead(
    v: [
        Map<string, Set<() => void>>,
        StateDump | null,
        ReturnType<typeof setTimeout> | null,
    ],
    pathname: string,
) {
    const id = getIdFromUrl();
    if (!id) return null;
    const r = await get(id);
    if (v[2]) return;
    if (pathname !== r.path) return;
    v[1] = r;
    for (const cbs of v[0].values()) {
        for (const cb of cbs.values()) cb();
    }
}

const pathRefMap = new Map<
    string,
    [
        Map<string, Set<() => void>>,
        StateDump | null,
        ReturnType<typeof setTimeout> | null,
    ]
>();

const blankStateDump: StateDump = {
    version: 1,
    path: "",
    columns: [],
    compareOn: false,
    selected: [],
    visibleColumns: {},
    sort: [],
    filter: "",
    region: "",
    pricingUnit: "instance",
    costDuration: "hourly",
    reservedTerm: "yrTerm1Standard.noUpfront",
};

function doLocalStorageRead(pathname: string) {
    const v = localStorage.getItem(`gstate-${pathname}`);
    if (!v) return { ...blankStateDump, path: pathname };
    return JSON.parse(v);
}

function useReadArr(pathname: string) {
    return useCallback(() => {
        // Get the [callbacks, data].
        let pathRef = pathRefMap.get(pathname);
        if (!pathRef) {
            pathRef = [new Map(), doLocalStorageRead(pathname), null];
            pathRefMap.set(pathname, pathRef);

            // As a side effect, read the data from the network if possible.
            doNetworkRead(pathRef, pathname).catch((e) => {
                console.error("Failed to read from instanceskv", e);
            });
        }
        return pathRef;
    }, [pathname]);
}

function resOrDefault<T>(v: T | undefined, defaultValue: T): T {
    if (Array.isArray(v) || typeof v === "object") return v;
    return v || defaultValue;
}

/**
 * Used to get a specific value from the global state.
 */
export function useGlobalStateValue<Key extends keyof StateDump>(
    key: Key,
    pathname: string,
    defaultValue?: StateDump[Key],
) {
    const readArr = useReadArr(pathname);

    const res = useSyncExternalStore(
        (onStoreChange) => {
            const [cbMap] = readArr();
            let specificMapping = cbMap.get(key);
            if (!specificMapping) {
                specificMapping = new Set();
                cbMap.set(key, specificMapping);
            }
            specificMapping.add(onStoreChange);
            return () => {
                specificMapping.delete(onStoreChange);
            };
        },
        () => {
            const [, data] = readArr();
            return resOrDefault(
                data?.[key],
                defaultValue ?? blankStateDump[key],
            );
        },
        () => defaultValue ?? blankStateDump[key],
    );

    return [
        res,
        useCallback(
            (
                value:
                    | StateDump[Key]
                    | ((value: StateDump[Key]) => StateDump[Key]),
            ) => {
                let v = readArr();
                if (!v[1]) {
                    // Clone the blank state dump.
                    v[1] = { ...blankStateDump };
                }

                // Set the value.
                if (typeof value === "function") value = value(v[1][key]);
                v[1][key] = value;

                // Write to local storage.
                localStorage.setItem(
                    `gstate-${pathname}`,
                    JSON.stringify(v[1]),
                );

                // Call the callbacks.
                const cbs = v[0].get(key) || new Set();
                for (const cb of cbs.values()) cb();

                // Write to the network after a delay.
                if (v[2]) clearTimeout(v[2]);
                v[2] = setTimeout(() => {
                    doWrite(v, pathname).catch((e) => {
                        console.error("Failed to write to instanceskv", e);
                    });
                    v[2] = null;
                }, 100);
            },
            [pathname, key],
        ),
    ] as const;
}

/**
 * Used to reset the global state to the default values.
 */
export function resetGlobalState(pathname: string) {
    localStorage.removeItem(`gstate-${pathname}`);
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());
    const v = pathRefMap.get(pathname);
    if (v) {
        v[1] = { ...blankStateDump };
        for (const cbs of v[0].values()) {
            for (const cb of cbs.values()) cb();
        }
    }
}
