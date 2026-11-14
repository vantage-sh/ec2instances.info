import { describe, it, expect } from "vitest";
import { calculateAndFormatCost, type GCPInstance } from "./gcp";

const currency = { code: "USD", usdRate: 1 };

describe("GCP unit pricing", () => {
    it.each([0, undefined, -1, NaN, Infinity, -Infinity])(
        "omits prices for invalid capacity %s",
        (capacity) => {
            const instance = {
                vCPU: capacity,
                memory: capacity,
            } as GCPInstance;
            for (const unit of ["vcpu", "memory"] as const) {
                expect(
                    calculateAndFormatCost(
                        0.499,
                        instance,
                        unit,
                        "hourly",
                        currency,
                    ),
                ).toBeUndefined();
            }
        },
    );

    it("preserves valid unit and per-instance prices", () => {
        const instance = { vCPU: 0, memory: 48 } as GCPInstance;
        expect(
            calculateAndFormatCost(
                0.499,
                instance,
                "instance",
                "hourly",
                currency,
            ),
        ).toBe("$0.4990 hourly");
        expect(
            calculateAndFormatCost(
                0.499,
                instance,
                "memory",
                "hourly",
                currency,
            ),
        ).toBe("$0.0104 hourly / GiB");
        expect(
            calculateAndFormatCost(
                0.499,
                { vCPU: 12, memory: 48 } as GCPInstance,
                "vcpu",
                "hourly",
                currency,
            ),
        ).toBe("$0.0416 hourly / vCPU");
    });
});
