import { describe, it, expect } from "vitest";
import { calculateAndFormatCost, type AzureInstance } from "./azure";

const currency = { code: "USD", usdRate: 1 };

describe("Azure unit pricing", () => {
    it.each([0, undefined, -1, NaN, Infinity, -Infinity])(
        "omits prices for invalid capacity %s",
        (capacity) => {
            const instance = {
                ACU: capacity,
                vcpu: capacity,
                memory: capacity,
            } as AzureInstance;
            for (const unit of ["ecu", "vcpu", "memory"] as const) {
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
        const instance = { ACU: 0, vcpu: 12, memory: 48 } as AzureInstance;
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
            calculateAndFormatCost(0.499, instance, "vcpu", "hourly", currency),
        ).toBe("$0.0416 hourly / vCPU");
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
                { ACU: 100 } as AzureInstance,
                "ecu",
                "hourly",
                currency,
            ),
        ).toBe("$0.0050 hourly / ACU");
    });
});
