import { CostDuration, PricingUnit } from "@/types";

export const pricingUnitOptions: { value: PricingUnit, label: string }[] = [
    { value: "instance", label: "Instance" },
    { value: "vcpu", label: "vCPU" },
    { value: "ecu", label: "ECU" },
    { value: "memory", label: "Memory" },
];

export const durationOptions: { value: CostDuration, label: string }[] = [
    { value: "secondly", label: "Per Second" },
    { value: "minutely", label: "Per Minute" },
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "annually", label: "Annually" },
];

export const reservedTermOptions = [
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
