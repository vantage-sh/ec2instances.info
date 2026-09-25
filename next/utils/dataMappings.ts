import { CostDuration, PricePrecision, PricingUnit } from "@/types";

export const pricingUnitOptions: { value: PricingUnit; label: string }[] = [
    { value: "instance", label: "Instance" },
    { value: "vcpu", label: "vCPU" },
    { value: "ecu", label: "ECU" },
    { value: "memory", label: "Memory" },
    { value: "gpu_memory", label: "GPU Memory" },
] as const;

export const precisionOptions: { value: PricePrecision; label: string }[] = [
    { value: "auto", label: "Auto" },
    { value: "1", label: "1 decimal" },
    { value: "2", label: "2 decimals" },
    { value: "3", label: "3 decimals" },
    { value: "4", label: "4 decimals" },
    { value: "5", label: "5 decimals" },
    { value: "6", label: "6 decimals" },
] as const;

export const durationOptions: { value: CostDuration; label: string }[] = [
    { value: "secondly", label: "Per Second" },
    { value: "minutely", label: "Per Minute" },
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "annually", label: "Annually" },
] as const;

type ReservedTermOption = {
    value: string;
    label: string;
    group?: string;
};

const RESERVED = "Reserved";
const INSTANCE_SAVINGS_GROUP = "Instance Savings Plan";
const COMPUTE_SAVINGS_PLAN = "Compute Savings Plan";
const DATABASE_SAVINGS_PLAN = "Database Savings Plan";
export const ML_SAVINGS_PLAN = "ML Savings Plan";

const sharedReservedTermOptions: ReservedTermOption[] = [
    {
        value: "yrTerm1Standard.noUpfront",
        label: "1-year - No Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm1Standard.partialUpfront",
        label: "1-year - Partial Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm1Standard.allUpfront",
        label: "1-year - Full Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm3Standard.noUpfront",
        label: "3-year - No Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm3Standard.partialUpfront",
        label: "3-year - Partial Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm3Standard.allUpfront",
        label: "3-year - Full Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm1Convertible.noUpfront",
        label: "1-year convertible - No Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm1Convertible.partialUpfront",
        label: "1-year convertible - Partial Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm1Convertible.allUpfront",
        label: "1-year convertible - Full Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm3Convertible.noUpfront",
        label: "3-year convertible - No Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm3Convertible.partialUpfront",
        label: "3-year convertible - Partial Upfront",
        group: RESERVED,
    },
    {
        value: "yrTerm3Convertible.allUpfront",
        label: "3-year convertible - Full Upfront",
        group: RESERVED,
    },
];

const savingsPlanExtras = {
    "yrTerm1Savings.noUpfront": "1-year Compute Savings Plan - No Upfront",
    "yrTerm1Savings.partialUpfront":
        "1-year Compute Savings Plan - Partial Upfront",
    "yrTerm1Savings.allUpfront": "1-year Compute Savings Plan - Full Upfront",
    "yrTerm3Savings.noUpfront": "3-year Compute Savings Plan - No Upfront",
    "yrTerm3Savings.partialUpfront":
        "3-year Compute Savings Plan - Partial Upfront",
    "yrTerm3Savings.allUpfront": "3-year Compute Savings Plan - Full Upfront",
    "yrTerm1MLSavings.noUpfront": "1-year ML Savings Plan - No Upfront",
    "yrTerm1MLSavings.partialUpfront":
        "1-year ML Savings Plan - Partial Upfront",
    "yrTerm1MLSavings.allUpfront": "1-year ML Savings Plan - Full Upfront",
    "yrTerm3MLSavings.noUpfront": "3-year ML Savings Plan - No Upfront",
    "yrTerm3MLSavings.partialUpfront":
        "3-year ML Savings Plan - Partial Upfront",
    "yrTerm3MLSavings.allUpfront": "3-year ML Savings Plan - Full Upfront",
    "yrTerm1InstanceSavings.noUpfront":
        "1-year Instance Savings Plan - No Upfront",
    "yrTerm1InstanceSavings.partialUpfront":
        "1-year Instance Savings Plan - Partial Upfront",
    "yrTerm1InstanceSavings.allUpfront":
        "1-year Instance Savings Plan - Full Upfront",
    "yrTerm3InstanceSavings.noUpfront":
        "3-year Instance Savings Plan - No Upfront",
    "yrTerm3InstanceSavings.partialUpfront":
        "3-year Instance Savings Plan - Partial Upfront",
    "yrTerm3InstanceSavings.allUpfront":
        "3-year Instance Savings Plan - Full Upfront",
    "yrTerm1DatabaseSavings.noUpfront":
        "1-year Database Savings Plan - No Upfront",
};

const savingsPlanCache = new Map<string, ReservedTermOption[]>();

export type SupportedSavingsPlanOptions = keyof typeof savingsPlanExtras;

/** Database Savings Plan terms exposed on RDS and ElastiCache listing pages. */
export const databaseSavingsPlanSupported = [
    "yrTerm1DatabaseSavings.noUpfront",
] as const satisfies readonly SupportedSavingsPlanOptions[];

/** SageMaker ML Savings Plan terms (scraper: yrTerm1MLSavings.*). */
export const sageMakerSavingsPlanSupported = [
    "yrTerm1MLSavings.noUpfront",
    "yrTerm1MLSavings.partialUpfront",
    "yrTerm1MLSavings.allUpfront",
    "yrTerm3MLSavings.noUpfront",
    "yrTerm3MLSavings.partialUpfront",
    "yrTerm3MLSavings.allUpfront",
] as const satisfies readonly SupportedSavingsPlanOptions[];

/** Label for reserved-cost columns: RI vs Savings Plan, based on the selected term key. */
export function commitmentTypeLabel(
    term: string,
):
    | "Reserved"
    | "Instance Savings Plan"
    | "Compute Savings Plan"
    | "Database Savings Plan"
    | "ML Savings Plan" {
    if (!term.includes("Savings")) {
        return "Reserved";
    }

    if (term.includes("InstanceSavings")) {
        return "Instance Savings Plan";
    }

    if (term.includes("DatabaseSavings")) {
        return "Database Savings Plan";
    }

    if (term.includes("MLSavings")) {
        return "ML Savings Plan";
    }

    return "Compute Savings Plan";
}

function savingsPlanGroup(term: string): string {
    if (term.includes("InstanceSavings")) {
        return INSTANCE_SAVINGS_GROUP;
    }
    if (term.includes("DatabaseSavings")) {
        return DATABASE_SAVINGS_PLAN;
    }
    if (term.includes("MLSavings")) {
        return ML_SAVINGS_PLAN;
    }
    return COMPUTE_SAVINGS_PLAN;
}

export const reservedTermOptions = (
    savingsPlanSupported: SupportedSavingsPlanOptions[] | undefined,
) => {
    if (!savingsPlanSupported) return sharedReservedTermOptions;
    const key = savingsPlanSupported.join(",");
    const cached = savingsPlanCache.get(key);
    if (cached) return cached;

    const instanceSavingsPlanGroup: ReservedTermOption[] = [];
    const databaseSavingsPlanGroup: ReservedTermOption[] = [];
    const mlSavingsPlanGroup: ReservedTermOption[] = [];
    const computeSavingsPlanGroup: ReservedTermOption[] = [];
    for (const savingsPlan of savingsPlanSupported) {
        const label = savingsPlanExtras[savingsPlan];
        if (!label) continue;
        const option = {
            value: savingsPlan,
            label,
            group: savingsPlanGroup(savingsPlan),
        };
        if (option.group === INSTANCE_SAVINGS_GROUP) {
            instanceSavingsPlanGroup.push(option);
        } else if (option.group === DATABASE_SAVINGS_PLAN) {
            databaseSavingsPlanGroup.push(option);
        } else if (option.group === ML_SAVINGS_PLAN) {
            mlSavingsPlanGroup.push(option);
        } else {
            computeSavingsPlanGroup.push(option);
        }
    }
    const options = [
        ...sharedReservedTermOptions,
        ...instanceSavingsPlanGroup,
        ...databaseSavingsPlanGroup,
        ...mlSavingsPlanGroup,
        ...computeSavingsPlanGroup,
    ];
    savingsPlanCache.set(key, options);
    return options;
};
