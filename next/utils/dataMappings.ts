import { CostDuration, PricingUnit } from "@/types";

export const pricingUnitOptions: { value: PricingUnit; label: string }[] = [
    { value: "instance", label: "Instance" },
    { value: "vcpu", label: "vCPU" },
    { value: "ecu", label: "ECU" },
    { value: "memory", label: "Memory" },
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

const sharedReservedTermOptions = [
    { value: "yrTerm1Standard.noUpfront", label: "1-year - No Upfront" },
    {
        value: "yrTerm1Standard.partialUpfront",
        label: "1-year - Partial Upfront",
    },
    { value: "yrTerm1Standard.allUpfront", label: "1-year - Full Upfront" },
    { value: "yrTerm3Standard.noUpfront", label: "3-year - No Upfront" },
    {
        value: "yrTerm3Standard.partialUpfront",
        label: "3-year - Partial Upfront",
    },
    { value: "yrTerm3Standard.allUpfront", label: "3-year - Full Upfront" },
    {
        value: "yrTerm1Convertible.noUpfront",
        label: "1-year convertible - No Upfront",
    },
    {
        value: "yrTerm1Convertible.partialUpfront",
        label: "1-year convertible - Partial Upfront",
    },
    {
        value: "yrTerm1Convertible.allUpfront",
        label: "1-year convertible - Full Upfront",
    },
    {
        value: "yrTerm3Convertible.noUpfront",
        label: "3-year convertible - No Upfront",
    },
    {
        value: "yrTerm3Convertible.partialUpfront",
        label: "3-year convertible - Partial Upfront",
    },
    {
        value: "yrTerm3Convertible.allUpfront",
        label: "3-year convertible - Full Upfront",
    },
];

const savingsPlanExtras = {
    "yrTerm1Savings.noUpfront": "1-year Savings Plan - No Upfront",
    "yrTerm1Savings.partialUpfront": "1-year Savings Plan - Partial Upfront",
    "yrTerm1Savings.allUpfront": "1-year Savings Plan - Full Upfront",
    "yrTerm3Savings.noUpfront": "3-year Savings Plan - No Upfront",
    "yrTerm3Savings.partialUpfront": "3-year Savings Plan - Partial Upfront",
    "yrTerm3Savings.allUpfront": "3-year Savings Plan - Full Upfront",
};

const savingsPlanCache = new Map<string, { value: string; label: string }[]>();

export type SupportedSavingsPlanOptions = keyof typeof savingsPlanExtras;

export const reservedTermOptions = (
    savingsPlanSupported: SupportedSavingsPlanOptions[] | undefined,
) => {
    if (!savingsPlanSupported) return sharedReservedTermOptions;
    const key = savingsPlanSupported.join(",");
    const cached = savingsPlanCache.get(key);
    if (cached) return cached;

    const extras: { value: string; label: string }[] = [];
    for (const sp of savingsPlanSupported) {
        const label = savingsPlanExtras[sp];
        if (label) {
            extras.push({ value: sp, label });
        }
    }
    const options = [...extras, ...sharedReservedTermOptions];
    savingsPlanCache.set(key, options);
    return options;
};
