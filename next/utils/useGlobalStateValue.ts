import { useCallback, useSyncExternalStore } from "react";
import { get, write, StateDump } from "./instancesKvClient";
import { migrateLocalStorage, migrateUrl } from "./migrations";
import { Mutex } from "async-mutex";
import { browserBlockingLocalStorage } from "./abGroup";

const writerMutex = new Mutex();

async function doWrite(
    [, data]: [
        Map<string, Set<() => void>>,
        StateDump,
        ReturnType<typeof setTimeout> | null,
    ],
    pathname: string,
) {
    if (!data) return;

    if (data.currency === undefined) {
        // Currency is a special case because it is sticky across tables.
        // We want this to be consistent with what is on the users display, but
        // we don't want to set it too early or else it might feel a bit weird for
        // the user.
        data = { ...data };
        const lsValue = browserBlockingLocalStorage
            ? null
            : localStorage.getItem("last_currency");
        data.currency = lsValue || "USD";
    }

    const idPromise = write(data);
    await writerMutex.runExclusive(async () => {
        const id = await idPromise;
        const url = new URL(window.location.href);
        if (url.pathname !== pathname) return;
        url.searchParams.set("id", id);
        window.history.replaceState({}, "", url.toString());
    });
}

function getIdFromUrl() {
    if (typeof window === "undefined") return null;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return null;
    return decodeURIComponent(id);
}

const lastCurrencyChangerEvents = new Set<() => void>();

async function doNetworkRead(
    v: [
        Map<string, Set<() => void>>,
        StateDump,
        ReturnType<typeof setTimeout> | null,
    ],
    pathname: string,
) {
    // Try to do the migration.
    const callbacks = () => {
        for (const cbs of v[0].values()) {
            for (const cb of cbs.values()) cb();
        }
    };
    if (await migrateUrl(callbacks, v[1])) return;

    // Try to read from the URL.
    const id = getIdFromUrl();
    if (!id) return null;
    const r = await get(id);
    if (v[2]) return;
    if (pathname !== r.path) return;
    v[1] = r;

    // Handle if currency is set.
    if (r.currency !== undefined) {
        if (!browserBlockingLocalStorage) {
            localStorage.setItem("last_currency", r.currency);
        }
        delete r.currency;
        for (const cb of lastCurrencyChangerEvents.values()) cb();
    }

    callbacks();
}

const pathRefMap = new Map<
    string,
    [
        Map<string, Set<() => void>>,
        StateDump,
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

function deepCopy<T>(v: T): T {
    return JSON.parse(JSON.stringify(v));
}

function doLocalStorageRead(pathname: string) {
    if (!browserBlockingLocalStorage) {
        const v = localStorage.getItem(`gstate-${pathname}`);
        if (!v) return { ...deepCopy(blankStateDump), path: pathname };
        return JSON.parse(v);
    }

    // Create a clean slate because we can't read from localStorage.
    return { ...deepCopy(blankStateDump), path: pathname };
}

function useReadArr(pathname: string) {
    return useCallback(() => {
        // Get the [callbacks, data].
        let pathRef = pathRefMap.get(pathname);
        if (!pathRef) {
            // Do the migration to local storage.
            migrateLocalStorage(() => deepCopy(blankStateDump));

            // Try to read from local storage initially.
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

// We copy here in case the user blocks localStorage.
let lastCurrencyCurrentValue: string | null = null;
if (typeof window !== "undefined") {
    lastCurrencyCurrentValue = browserBlockingLocalStorage
        ? null
        : localStorage.getItem("last_currency");
}

export function useLastCurrencyLocalStorageValue() {
    return useSyncExternalStore(
        (subscribe) => {
            lastCurrencyChangerEvents.add(subscribe);
            return () => {
                lastCurrencyChangerEvents.delete(subscribe);
            };
        },
        () => lastCurrencyCurrentValue,
        () => null,
    );
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
                // Set the value.
                const v = readArr();
                if (typeof value === "function") value = value(v[1][key]);
                v[1][key] = value;

                // Because its a special sticky case, we need to call the callbacks for changes
                // and set it, but not set it in local state to maintain global stickiness.
                if (key === "currency" && !browserBlockingLocalStorage) {
                    const v = value!.toString();
                    lastCurrencyCurrentValue = v;
                    if (!browserBlockingLocalStorage) {
                        localStorage.setItem("last_currency", v);
                    }
                    for (const cb of lastCurrencyChangerEvents.values()) cb();
                }

                // Write to local storage.
                if (!browserBlockingLocalStorage) {
                    localStorage.setItem(
                        `gstate-${pathname}`,
                        JSON.stringify({
                            ...v[1],
                            // NEVER set the currency locally. We have the last_currency sticky value.
                            currency: undefined,
                        }),
                    );
                }

                if (key !== "currency") {
                    // Call the callbacks.
                    const cbs = v[0].get(key) || new Set();
                    for (const cb of cbs.values()) cb();
                }

                // Write to the network after a delay.
                if (v[2]) clearTimeout(v[2]);
                v[2] = setTimeout(() => {
                    doWrite(v, pathname).catch((e) => {
                        console.error("Failed to write to instanceskv", e);
                    });
                    v[2] = null;
                }, 300);
            },
            [pathname, key],
        ),
    ] as const;
}

/**
 * Used to reset the global state to the default values.
 */
export function resetGlobalState(pathname: string) {
    if (!browserBlockingLocalStorage) {
        localStorage.removeItem(`gstate-${pathname}`);
        localStorage.removeItem("last_currency");
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());
    const v = pathRefMap.get(pathname);
    if (v) {
        v[1] = { ...deepCopy(blankStateDump), path: pathname };
        for (const cb of lastCurrencyChangerEvents.values()) cb();
        for (const cbs of v[0].values()) {
            for (const cb of cbs.values()) cb();
        }
    }
}
