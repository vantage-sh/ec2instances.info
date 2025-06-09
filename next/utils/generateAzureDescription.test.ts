import { describe, it, expect } from "vitest";
import generateAzureDescription from "./generateAzureDescription";

describe("generateAzureDescription", () => {
    it("generates description for Linux instance with on-demand pricing", () => {
        const instance = {
            instance_type: "Standard_D2s_v3",
            family: "general purpose",
            vcpu: 2,
            memory: 8,
            pretty_name_azure: "D2s v3",
            pricing: {
                "us-east": {
                    linux: {
                        ondemand: "0.096",
                    },
                },
            },
        };

        const expected =
            "The D2s v3 is in the General Purpose series with 2 vCPUs and 8 GiB of memory starting at $0.096 per hour on-demand.";
        expect(generateAzureDescription(instance)).toBe(expected);
    });

    it("generates description for Windows instance with spot pricing", () => {
        const instance = {
            instance_type: "Standard_D2s_v3",
            family: "general purpose",
            vcpu: 2,
            memory: 8,
            pretty_name_azure: "D2s v3",
            pricing: {
                "us-east": {
                    windows: {
                        ondemand: "0.192",
                        spot_min: "0.0576",
                    },
                },
            },
        };

        const expected =
            "The D2s v3 is in the General Purpose series with 2 vCPUs and 8 GiB of memory starting at $0.192 per hour on-demand or $0.0576 per hour with spot instances.";
        expect(generateAzureDescription(instance)).toBe(expected);
    });

    it("uses first available region if us-east is not available", () => {
        const instance = {
            instance_type: "Standard_D2s_v3",
            family: "general purpose",
            vcpu: 2,
            memory: 8,
            pretty_name_azure: "D2s v3",
            pricing: {
                "us-west": {
                    linux: {
                        ondemand: "0.096",
                    },
                },
            },
        };

        const expected =
            "The D2s v3 is in the General Purpose series with 2 vCPUs and 8 GiB of memory starting at $0.096 per hour on-demand.";
        expect(generateAzureDescription(instance)).toBe(expected);
    });

    it("uses first available platform if linux is not available", () => {
        const instance = {
            instance_type: "Standard_D2s_v3",
            family: "general purpose",
            vcpu: 2,
            memory: 8,
            pretty_name_azure: "D2s v3",
            pricing: {
                "us-east": {
                    windows: {
                        ondemand: "0.192",
                    },
                },
            },
        };

        const expected =
            "The D2s v3 is in the General Purpose series with 2 vCPUs and 8 GiB of memory starting at $0.192 per hour on-demand.";
        expect(generateAzureDescription(instance)).toBe(expected);
    });

    it("throws error when no platform pricing is available", () => {
        const instance = {
            instance_type: "Standard_D2s_v3",
            family: "general purpose",
            vcpu: 2,
            memory: 8,
            pretty_name_azure: "D2s v3",
            pricing: {
                "us-east": {},
            },
        };

        expect(() => generateAzureDescription(instance)).toThrow(
            "No platform found for Standard_D2s_v3",
        );
    });
});
