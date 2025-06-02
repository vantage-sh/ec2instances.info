import { StateDump } from "./instancesKvClient";

function splitRemovingBlanks(s: string, delimiter: string) {
    return s.split(delimiter).filter((x) => x !== "");
}

type WhereString<T> = {
    [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

function remapVcpus(path: string) {
    switch (path) {
        case "/":
        case "/redshift":
            return "vCPU";
        case "/cache":
        case "/rds":
            return "vcpus";
        default:
            return "vcpu";
    }
}

function mergeGSettings(state: StateDump, encodedGSettings: string) {
    try {
        const gSettings = JSON.parse(encodedGSettings) as any;

        // Time to deal with 12 years of edge cases!

        const migrateString = <K extends WhereString<StateDump>>(
            newKey: K,
            oldKey: string,
        ) => {
            if (typeof gSettings[oldKey] === "string") {
                state[newKey] = gSettings[oldKey];
            }
        };

        // Migrate the low hanging fruit first.
        migrateString("pricingUnit", "pricing_unit");
        migrateString("costDuration", "cost_duration");
        migrateString("region", "region");
        migrateString("reservedTerm", "reserved_term");

        if (gSettings.compare_on) {
            state.compareOn = true;

            // For some reason, in the old version, this caused it to use the filter as a pipe
            // split holder of everything. Handle this here.
            if (typeof gSettings.filter === "string")
                state.selected = splitRemovingBlanks(gSettings.filter, "|");
        } else {
            // We can just use the filter presuming its a string.
            migrateString("filter", "filter");

            // selected is a comma seperated list of IDs.
            if (typeof gSettings.selected === "string")
                state.selected = splitRemovingBlanks(gSettings.selected, ",");
        }

        // Handle *_expr and the original jQuery equivelents.
        const migrateExpr = (key: string) => {
            // Prefer *_expr.
            let expr: string | undefined = gSettings[key + "_expr"];
            if (typeof expr !== "string") expr = undefined;

            if (!expr) {
                // If *_min exists, we will migrate that initially to expr.
                const min = gSettings[key + "_min"];
                if (min === undefined) return;
                expr = `>=${min}`;
            }

            if (expr === ">=0") {
                // We can ignore this.
                return;
            }

            // Check if the key needs to be changed.
            switch (key) {
                case "gpus":
                    key = "GPU";
                    break;
                case "gpu_memory":
                    key = "GPU_memory";
                    break;
                case "vcpus":
                    key = remapVcpus(state.path);
                    break;
            }

            // Write the filter.
            state.columns.push({
                id: key,
                value: expr,
            });
        };
        migrateExpr("memory");
        migrateExpr("vcpus");
        migrateExpr("memory_per_vcpu");
        migrateExpr("gpus");
        migrateExpr("gpu_memory");
        migrateExpr("maxips");
        migrateExpr("storage");
    } catch {
        // Any errors here means the user had a malformed configuration. Just return false.
        return false;
    }
    return true;
}

function mergeColumnVisibility(
    state: StateDump,
    encodedColumnVisibility: string,
) {
    try {
        const columnVisibility = JSON.parse(encodedColumnVisibility) as any;
        if (typeof columnVisibility !== "object") return false;

        for (const value of Object.values(columnVisibility)) {
            if (typeof value !== "boolean") return false;
        }

        // Write the column visibility.
        state.visibleColumns = columnVisibility;
    } catch {
        // Any errors here means the user had a malformed configuration. Just return false.
        return false;
    }
    return true;
}

function mergeDataTables(state: StateDump, encodedDataTables: string) {
    // TODO
    return true;
}

/** Migrate the local storage to the new format. */
export function migrateLocalStorage(getBlankState: () => StateDump) {
    // Yes I know, I laughed at this too. This is genuinely how you get all keys in local storage.
    // I love this beautiful mess of a language -Astrid
    const keys = Object.keys(localStorage);

    // Do not do any migrations if there is any keys starting with "gstate-". The user is at least up
    // to global state V1.
    if (keys.some((k) => k.startsWith("gstate-"))) return;

    // Track the migrations we will want to do.
    type BeingMigrated = {
        gSettingsData?: string;
        dataTablesData?: string;
        columnVisibilityData?: string;
        keysToRemove: string[];
    };
    const needMigrating: Map<string, BeingMigrated> = new Map();
    const push = <Key extends keyof BeingMigrated>(
        path: string,
        k: Key,
        v: BeingMigrated[Key],
        removeKey: string,
    ) => {
        const data = needMigrating.get(path);
        if (!data) {
            needMigrating.set(path, {
                [k]: v,
                keysToRemove: [removeKey],
            });
        } else {
            data[k] = v;
            data.keysToRemove.push(removeKey);
        }
    };

    for (const key of keys) {
        switch (key) {
            // The original g_settings type that this site used.

            case "ec2_settings":
                // In both legacy and before this, this applied to all AWS stuff.
                (() => {
                    const v = localStorage.getItem(key)!;
                    push("/", "gSettingsData", v, key);
                    push("/rds", "gSettingsData", v, key);
                    push("/cache", "gSettingsData", v, key);
                    push("/redshift", "gSettingsData", v, key);
                    push("/opensearch", "gSettingsData", v, key);
                })();
                break;
            case "azure_settings":
                // This applies to /azure only.
                push(
                    "/azure",
                    "gSettingsData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;

            // The DataTables data that was used by the original jQuery version.

            case "DataTables_data_/":
                push("/", "dataTablesData", localStorage.getItem(key)!, key);
                break;
            case "DataTables_data_/rds/":
                push("/rds", "dataTablesData", localStorage.getItem(key)!, key);
                break;
            case "DataTables_data_/cache/":
                push(
                    "/cache",
                    "dataTablesData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "DataTables_data_/redshift/":
                push(
                    "/redshift",
                    "dataTablesData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "DataTables_data_/opensearch/":
                push(
                    "/opensearch",
                    "dataTablesData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "DataTables_data_/azure/":
                push(
                    "/azure",
                    "dataTablesData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;

            // The column visibility data that was used for the first iteration of the rewrite.

            case "columnVisibility_ec2":
                push(
                    "/",
                    "columnVisibilityData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "columnVisibility_rds":
                push(
                    "/rds",
                    "columnVisibilityData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "columnVisibility_cache":
                push(
                    "/cache",
                    "columnVisibilityData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "columnVisibility_redshift":
                push(
                    "/redshift",
                    "columnVisibilityData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "columnVisibility_opensearch":
                push(
                    "/opensearch",
                    "columnVisibilityData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
            case "columnVisibility_azure":
                push(
                    "/azure",
                    "columnVisibilityData",
                    localStorage.getItem(key)!,
                    key,
                );
                break;
        }
    }

    for (const [path, data] of needMigrating) {
        // Get the state we will merge everything into.
        const state = getBlankState();
        state.path = path;

        // Attempt to merge as many as possible.
        let anySuccess = false;
        if (data.gSettingsData) {
            const success = mergeGSettings(state, data.gSettingsData);
            if (success) anySuccess = true;
        }
        if (data.columnVisibilityData) {
            // Prefer the newer format over DataTables.
            const success = mergeColumnVisibility(
                state,
                data.columnVisibilityData,
            );
            if (success) anySuccess = true;
        } else if (data.dataTablesData) {
            // ...but still migrate the DataTables data.
            const success = mergeDataTables(state, data.dataTablesData);
            if (success) anySuccess = true;
        }

        // If any were successful, delete the old keys and save the new state.
        if (anySuccess) {
            for (const key of data.keysToRemove) {
                localStorage.removeItem(key);
            }
            localStorage.setItem(`gstate-${path}`, JSON.stringify(state));
        }
    }
}

/** Migrate the URL to the new format by uploading the previous state to the network. */
export async function migrateUrl(callbacks: () => void, state: StateDump) {
    // TODO
    return false;
}
