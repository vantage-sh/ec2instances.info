const g_settings_default = {
    pricing_unit: "instance",
    cost_duration: "hourly",
    region: "us-east-1",
    reserved_term: "yrTerm1Standard.noUpfront",
    savings_plan_term: "yrTerm1Savings.allUpfront",
    min_memory: 0,
    min_vcpus: 0,
    min_memory_per_vcpu: 0,
    min_gpu_memory: 0,
    min_gpus: 0,
    min_maxips: 0,
    default_sort_col: 40,
    min_storage: 0,
    selected: "",
    compare_on: false,
};

type GSettingsDefault = typeof g_settings_default;
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

function validateNumber(value: string): number {
    const num = Number(value);
    if (isNaN(num)) throw new Error("Invalid number");
    return num;
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

/**
 * Abstraction of the g_settings object from the old codebase.
 * Note this is not in itself reactive, but it provides a type-safe way to access and modify settings.
 */
export default class GSettings {
    settings: typeof g_settings_default;
    key: string;
    filterData = "";

    constructor(azure: boolean) {
        this.key = azure ? "azure_settings" : "aws_settings";
        this.settings = { ...g_settings_default };
        const stored = localStorage.getItem(this.key);
        if (stored) {
            try {
                this.settings = JSON.parse(stored);
            } catch {
                // Weird.
            }
        }
        this._readFromUrl();
    }

    private _readFromUrl() {
        const params = new URLSearchParams(window.location.search);
        validate(params, this.settings, "min_memory", validateNumber);
        validate(params, this.settings, "min_vcpus", validateNumber);
        validate(params, this.settings, "min_memory_per_vcpu", validateNumber);
        validate(params, this.settings, "min_gpus", validateNumber);
        validate(params, this.settings, "min_gpu_memory", validateNumber);
        validate(params, this.settings, "min_maxips", validateNumber);
        validate(params, this.settings, "min_storage", validateNumber);
        validate(params, this.settings, "region");
        validate(params, this.settings, "pricing_unit");
        validate(params, this.settings, "cost_duration");
        validate(params, this.settings, "reserved_term");
        validate(params, this.settings, "compare_on", validateBoolean);

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
            min_memory: this.minMemory,
            min_vcpus: this.minVcpus,
            min_memory_per_vcpu: this.minMemoryPerVcpu,
            min_gpus: this.minGpus,
            min_gpu_memory: this.minGpuMemory,
            min_maxips: this.minMaxips,
            min_storage: this.minStorage,
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

    get pricingUnit() {
        return this.settings.pricing_unit;
    }

    set pricingUnit(value: string) {
        this.settings.pricing_unit = value;
        this._write();
    }

    get costDuration() {
        return this.settings.cost_duration;
    }

    set costDuration(value: string) {
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

    get savingsPlanTerm() {
        return this.settings.savings_plan_term;
    }

    set savingsPlanTerm(value: string) {
        this.settings.savings_plan_term = value;
        this._write();
    }

    get minMemory() {
        return this.settings.min_memory;
    }

    set minMemory(value: number) {
        this.settings.min_memory = value;
        this._write();
    }

    get minVcpus() {
        return this.settings.min_vcpus;
    }

    set minVcpus(value: number) {
        this.settings.min_vcpus = value;
        this._write();
    }

    get minMemoryPerVcpu() {
        return this.settings.min_memory_per_vcpu;
    }

    set minMemoryPerVcpu(value: number) {
        this.settings.min_memory_per_vcpu = value;
        this._write();
    }

    get minGpuMemory() {
        return this.settings.min_gpu_memory;
    }

    set minGpuMemory(value: number) {
        this.settings.min_gpu_memory = value;
        this._write();
    }

    get minGpus() {
        return this.settings.min_gpus;
    }

    set minGpus(value: number) {
        this.settings.min_gpus = value;
        this._write();
    }

    get minMaxips() {
        return this.settings.min_maxips;
    }

    set minMaxips(value: number) {
        this.settings.min_maxips = value;
        this._write();
    }

    get defaultSortCol() {
        return this.settings.default_sort_col;
    }

    set defaultSortCol(value: number) {
        this.settings.default_sort_col = value;
        this._write();
    }

    get minStorage() {
        return this.settings.min_storage;
    }

    set minStorage(value: number) {
        this.settings.min_storage = value;
        this._write();
    }

    get compareOn() {
        return this.settings.compare_on;
    }

    set compareOn(value: boolean) {
        this.settings.compare_on = value;
        this._write();
    }

    get selected() {
        return this.settings.selected.split(",");
    }

    set selected(value: string[]) {
        this.settings.selected = value.join(",");
        this._write();
    }

    clear() {
        this.filterData = "";
        this.settings = { ...g_settings_default };
        this._write();
    }
}
