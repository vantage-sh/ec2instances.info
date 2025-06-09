import { describe, it, expect } from "vitest";
import generateEc2Description from "./generateEc2Description";

describe("generateEc2Description", () => {
    it("should generate description for instance with low network performance", () => {
        const instance = {
            instance_type: "t3.micro",
            family: "General Purpose",
            vCPU: 2,
            memory: 1,
            network_performance: "Low",
        };
        const ondemandCost = "0.0104";

        const expected =
            "The t3.micro instance is in the General Purpose family with 2 vCPUs, 1 GiB of memory and low network performance starting at $0.0104 per hour.";
        expect(generateEc2Description(instance, ondemandCost)).toBe(expected);
    });

    it("should generate description for instance with specific bandwidth", () => {
        const instance = {
            instance_type: "c5.2xlarge",
            family: "Compute Optimized",
            vCPU: 8,
            memory: 16,
            network_performance: "10 Gigabit",
        };
        const ondemandCost = "0.17";

        const expected =
            "The c5.2xlarge instance is in the Compute Optimized family with 8 vCPUs, 16 GiB of memory and 10 Gibps of bandwidth starting at $0.17 per hour.";
        expect(generateEc2Description(instance, ondemandCost)).toBe(expected);
    });

    it("should handle moderate network performance", () => {
        const instance = {
            instance_type: "m5.large",
            family: "General Purpose",
            vCPU: 2,
            memory: 8,
            network_performance: "Moderate",
        };
        const ondemandCost = "0.096";

        const expected =
            "The m5.large instance is in the General Purpose family with 2 vCPUs, 8 GiB of memory and moderate network performance starting at $0.096 per hour.";
        expect(generateEc2Description(instance, ondemandCost)).toBe(expected);
    });

    it("should handle high network performance", () => {
        const instance = {
            instance_type: "r5.4xlarge",
            family: "Memory Optimized",
            vCPU: 16,
            memory: 128,
            network_performance: "High",
        };
        const ondemandCost = "1.008";

        const expected =
            "The r5.4xlarge instance is in the Memory Optimized family with 16 vCPUs, 128 GiB of memory and high network performance starting at $1.008 per hour.";
        expect(generateEc2Description(instance, ondemandCost)).toBe(expected);
    });
});
