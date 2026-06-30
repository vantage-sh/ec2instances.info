import { describe, it, expect } from "vitest";
import buildInstanceDescription from "./buildInstanceDescription";
import makeDictionaryTranslator from "./makeDictionaryTranslator";
import enUSCommon from "@/translations/en-US/common.json";

// Exercises the real en-US template so the English copy stays in sync with the
// translation files (the single source of truth for the description wording).
const t = makeDictionaryTranslator(enUSCommon as Record<string, unknown>);

describe("buildInstanceDescription", () => {
    it("should generate description for instance with low network performance", () => {
        const instance = {
            instance_type: "t3.micro",
            family: "General Purpose",
            vCPU: 2,
            memory: 1,
            network_performance: "Low",
        };

        expect(buildInstanceDescription(t, instance, "0.0104")).toBe(
            "The t3.micro instance is in the General Purpose family with 2 vCPUs, 1 GiB of memory and low network performance starting at $0.0104 per hour.",
        );
    });

    it("should generate description for instance with specific bandwidth", () => {
        const instance = {
            instance_type: "c5.2xlarge",
            family: "Compute Optimized",
            vCPU: 8,
            memory: 16,
            network_performance: "10 Gigabit",
        };

        expect(buildInstanceDescription(t, instance, "0.17")).toBe(
            "The c5.2xlarge instance is in the Compute Optimized family with 8 vCPUs, 16 GiB of memory and 10 Gibps of bandwidth starting at $0.17 per hour.",
        );
    });

    it("should handle moderate network performance", () => {
        const instance = {
            instance_type: "m5.large",
            family: "General Purpose",
            vCPU: 2,
            memory: 8,
            network_performance: "Moderate",
        };

        expect(buildInstanceDescription(t, instance, "0.096")).toBe(
            "The m5.large instance is in the General Purpose family with 2 vCPUs, 8 GiB of memory and moderate network performance starting at $0.096 per hour.",
        );
    });

    it("should handle high network performance", () => {
        const instance = {
            instance_type: "r5.4xlarge",
            family: "Memory Optimized",
            vCPU: 16,
            memory: 128,
            network_performance: "High",
        };

        expect(buildInstanceDescription(t, instance, "1.008")).toBe(
            "The r5.4xlarge instance is in the Memory Optimized family with 16 vCPUs, 128 GiB of memory and high network performance starting at $1.008 per hour.",
        );
    });

    it("should omit bandwidth when network performance is empty", () => {
        const instance = {
            instance_type: "x1.16xlarge",
            family: "Memory Optimized",
            vCPU: 64,
            memory: 976,
            network_performance: "",
        };

        expect(buildInstanceDescription(t, instance, "6.669")).toBe(
            "The x1.16xlarge instance is in the Memory Optimized family with 64 vCPUs, 976 GiB of memory starting at $6.669 per hour.",
        );
    });
});
