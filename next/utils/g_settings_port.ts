import { CostDuration, PricingUnit } from "@/types";

export const g_settings_aws_default = {
    pricing_unit: "instance",
    cost_duration: "hourly",
    region: "us-east-1",
    reserved_term: "yrTerm1Standard.noUpfront",
    memory_expr: ">=0",
    vcpus_expr: ">=0",
    memory_per_vcpu_expr: ">=0",
    gpu_memory_expr: ">=0",
    gpus_expr: ">=0",
    maxips_expr: ">=0",
    storage_expr: ">=0",
    default_sort_col: 40,
    selected: "",
    compare_on: false,
};

export const g_settings_azure_default = {
    ...g_settings_aws_default,
    region: "us-east",
    reserved_term: "yrTerm1Standard.allUpfront",
};

type GSettingsDefault = typeof g_settings_aws_default;
type GSettingsKey = keyof GSettingsDefault;

/** Used internally to validate and set values. */
function validate<K extends GSettingsKey>(
    params: URLSearchParams,
    obj: GSettingsDefault,
    key: K,
): void;
function validate<K extends GSettingsKey>(
    params: URLSearchParams,
    obj: GSettingsDefault,
    key: K,
    f?: (item: string) => GSettingsDefault[K],
): void;
function validate<K extends GSettingsKey>(
    params: URLSearchParams,
    obj: GSettingsDefault,
    key: K,
    f?: (item: string) => GSettingsDefault[K],
): void {
    let value: any = params.get(key);
    if (value === null) return;
    if (f) {
        try {
            value = f(value);
        } catch {
            return;
        }
    }
    obj[key] = value;
}

const boolValues = {
    true: true,
    false: false,
    "1": true,
    "0": false,
    yes: true,
    no: false,
    on: true,
    off: false,
};

function validateBoolean(value: string): boolean {
    const bool = boolValues[value.toLowerCase() as keyof typeof boolValues];
    if (bool === undefined) throw new Error("Invalid boolean");
    return bool;
}

function doMinToExprParamsMigration(params: URLSearchParams) {
    const mins = [
        "min_memory",
        "min_vcpus",
        "min_memory_per_vcpu",
        "min_gpus",
        "min_gpu_memory",
        "min_maxips",
        "min_storage",
    ];
    for (const min of mins) {
        const value = params.get(min);
        if (value) {
            params.set(min.replace("min_", "") + "_expr", `>=${value}`);
            params.delete(min);
        }
    }
}

function doMinToExprSettingsMigration(settings: typeof g_settings_aws_default) {
    const mins = [
        "min_memory",
        "min_vcpus",
        "min_memory_per_vcpu",
        "min_gpus",
        "min_gpu_memory",
        "min_maxips",
        "min_storage",
    ];
    for (const min of mins) {
        const value = settings[min as keyof typeof settings];
        if (value !== undefined) {
            // @ts-expect-error: This is dynamic
            settings[min.replace("min_", "") + "_expr"] = `>=${value}`;
            delete settings[min as keyof typeof settings];
        }
    }
}

/**
 * Abstraction of the g_settings object from the old codebase.
 * Note this is not in itself reactive, but it provides a type-safe way to access and modify settings.
 */
export default class GSettings {
    settings: typeof g_settings_aws_default;
    key: string;
    filterData = "";
    filterPreCompareOn = "";

    constructor(
        private azure: boolean,
        private notRoot: boolean,
    ) {
        this.key = this.azure ? "azure_settings" : "aws_settings";
        this.settings = this.azure
            ? { ...g_settings_azure_default }
            : { ...g_settings_aws_default };
        const stored = localStorage.getItem(this.key);
        if (stored) {
            try {
                this.settings = JSON.parse(stored);
            } catch {
                // Weird.
            }
        }
        doMinToExprSettingsMigration(this.settings);
        this._readFromUrl();
    }

    private _readFromUrl() {
        const params = new URLSearchParams(window.location.search);
        doMinToExprParamsMigration(params);
        validate(params, this.settings, "memory_expr");
        validate(params, this.settings, "vcpus_expr");
        validate(params, this.settings, "memory_per_vcpu_expr");
        if (!this.notRoot) {
            validate(params, this.settings, "gpus_expr");
            validate(params, this.settings, "gpu_memory_expr");
            validate(params, this.settings, "maxips_expr");
        }
        validate(params, this.settings, "storage_expr");
        validate(params, this.settings, "region");
        validate(params, this.settings, "pricing_unit");
        validate(params, this.settings, "cost_duration");
        validate(params, this.settings, "reserved_term");
        validate(params, this.settings, "compare_on", validateBoolean);

        if (this.azure) {
            // Migration for the old savings plan term.
            const savingsPlanTerm = params.get("savings_plan_term");
            if (savingsPlanTerm) {
                this.settings.reserved_term = savingsPlanTerm.replace(
                    "Savings",
                    "Standard",
                );
            }
            this.settings.reserved_term = this.settings.reserved_term.replace(
                "noUpfront",
                "allUpfront",
            );
        }

        if (params.has("filter")) {
            this.filter = params.get("filter")!;
        }

        const selected = params.get("selected");
        if (selected) {
            this.selected = selected.split(",");
        }
    }

    private _write() {
        localStorage.setItem(this.key, JSON.stringify(this.settings));
        const params: Record<string, any> = {
            memory_expr: this.memoryExpr,
            vcpus_expr: this.vcpuExpr,
            memory_per_vcpu_expr: this.memoryPerVcpuExpr,
            gpu_memory_expr: this.gpuMemoryExpr,
            gpus_expr: this.gpusExpr,
            maxips_expr: this.maxipsExpr,
            storage_expr: this.storageExpr,
            filter: this.filter,
            region: this.region,
            pricing_unit: this.pricingUnit,
            cost_duration: this.costDuration,
            reserved_term: this.reservedTerm,
            compare_on: this.compareOn,
        };
        if (this.selected.length > 0) {
            params.selected = this.settings.selected;
        }
        if (this.notRoot) {
            delete params.min_gpus;
            delete params.min_gpu_memory;
            delete params.min_maxips;
        }
        const paramsStringify = new URLSearchParams(params);
        window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?${paramsStringify.toString()}`,
        );
    }

    get filter() {
        return this.filterData;
    }

    set filter(value: string) {
        this.filterData = value;
        this._write();
    }

    get pricingUnit(): PricingUnit {
        return this.settings.pricing_unit as PricingUnit;
    }

    set pricingUnit(value: PricingUnit) {
        this.settings.pricing_unit = value;
        this._write();
    }

    get costDuration(): CostDuration {
        return this.settings.cost_duration as CostDuration;
    }

    set costDuration(value: CostDuration) {
        this.settings.cost_duration = value;
        this._write();
    }

    get region() {
        return this.settings.region;
    }

    set region(value: string) {
        this.settings.region = value;
        this._write();
    }

    get reservedTerm() {
        return this.settings.reserved_term;
    }

    set reservedTerm(value: string) {
        this.settings.reserved_term = value;
        this._write();
    }

    get memoryExpr() {
        return this.settings.memory_expr;
    }

    set memoryExpr(value: string) {
        this.settings.memory_expr = value;
        this._write();
    }

    get vcpuExpr() {
        return this.settings.vcpus_expr;
    }

    set vcpuExpr(value: string) {
        this.settings.vcpus_expr = value;
        this._write();
    }

    get memoryPerVcpuExpr() {
        return this.settings.memory_per_vcpu_expr;
    }

    set memoryPerVcpuExpr(value: string) {
        this.settings.memory_per_vcpu_expr = value;
        this._write();
    }

    get gpuMemoryExpr() {
        return this.settings.gpu_memory_expr;
    }

    set gpuMemoryExpr(value: string) {
        this.settings.gpu_memory_expr = value;
        this._write();
    }

    get gpusExpr() {
        return this.settings.gpus_expr;
    }

    set gpusExpr(value: string) {
        this.settings.gpus_expr = value;
        this._write();
    }

    get maxipsExpr() {
        return this.settings.maxips_expr;
    }

    set maxipsExpr(value: string) {
        this.settings.maxips_expr = value;
        this._write();
    }

    get defaultSortCol() {
        return this.settings.default_sort_col;
    }

    set defaultSortCol(value: number) {
        this.settings.default_sort_col = value;
        this._write();
    }

    get storageExpr() {
        return this.settings.storage_expr;
    }

    set storageExpr(value: string) {
        this.settings.storage_expr = value;
        this._write();
    }

    get compareOn() {
        return this.settings.compare_on;
    }

    set compareOn(value: boolean) {
        if (value) {
            this.filterPreCompareOn = this.filter;
            this.filter = this.selected.join("|");
            this.selected = [];
        } else {
            this.selected = this.filter.split("|");
            this.filter = this.filterPreCompareOn;
        }
        this.settings.compare_on = value;
        this._write();
    }

    get selected() {
        const v = this.settings.selected.split(",");
        if (v.length === 1 && v[0] === "") {
            return [];
        }
        return v;
    }

    set selected(value: string[]) {
        this.settings.selected = value.join(",");
        if (this.settings.selected === ",") {
            this.settings.selected = "";
        }
        this._write();
    }

    clear() {
        this.filterData = "";
        this.settings = this.azure
            ? { ...g_settings_azure_default }
            : { ...g_settings_aws_default };
        this._write();
    }
}
