import { vi } from "vitest";

// English translations for testing - mirrors the actual translation files
const translations: Record<string, string> = {
    // Instance page translations
    "instancePage.pricing": "Pricing",
    "instancePage.onDemand": "On Demand",
    "instancePage.spot": "Spot",
    "instancePage.reserved1Year": "1-Year Reserved",
    "instancePage.reserved3Year": "3-Year Reserved",
    "instancePage.mainRegions": "Main Regions",
    "instancePage.chinaRegions": "China Regions",
    "instancePage.localZones": "Local Zones",
    "instancePage.wavelength": "Wavelength",
    "instancePage.familySizes": "Family Sizes",
    "instancePage.size": "Size",
    "instancePage.vCPUs": "vCPUs",
    "instancePage.memoryGiB": "Memory (GiB)",
    "instancePage.instanceVariants": "Instance Variants",
    "instancePage.variant": "Variant",
    "instancePage.instanceDetails": "Instance Details",
    "instancePage.value": "Value",
    "instancePage.ec2CostHelp": "Having trouble making sense of your EC2 costs? Check out",
    "instancePage.ec2CostHelpSuffix": "for an AWS billing code lookup tool.",
    "instancePage.requestDemo": "Request a demo",
    // Duration translations
    "durations.secondly": "Per Second",
    "durations.minutely": "Per Minute",
    "durations.hourly": "Hourly",
    "durations.daily": "Daily",
    "durations.weekly": "Weekly",
    "durations.monthly": "Monthly",
    "durations.annually": "Annually",
    // OS translations
    "os.linux": "Linux",
    "os.windows": "Windows",
    "os.rhel": "Red Hat",
    "os.rhelHA": "Red Hat with HA",
    "os.sles": "SUSE",
    "os.dedicated": "Dedicated Host",
};

// Mock gt-next translation library for tests
vi.mock("gt-next", () => ({
    useTranslations: () => (key: string, values?: Record<string, string>) => {
        let result = translations[key] || key;
        // If values are provided, replace placeholders
        if (values) {
            for (const [k, v] of Object.entries(values)) {
                result = result.replace(`{${k}}`, v);
            }
        }
        return result;
    },
    useLocale: () => "en-GB",
    GTProvider: ({ children }: { children: React.ReactNode }) => children,
}));
