import { describe, expect, it } from "vitest";
import { costExpr } from "./shared";

function rowWithCost(value: number | undefined) {
    return {
        getValue: () => value,
    } as any;
}

describe("cost expression filter", () => {
    it("filters calculated prices by numeric comparison", () => {
        expect(costExpr(rowWithCost(39.99), "cost-reserved", "<40")).toBe(
            true,
        );
        expect(costExpr(rowWithCost(40), "cost-reserved", "<40")).toBe(
            false,
        );
    });

    it("excludes instances without a calculated price", () => {
        expect(costExpr(rowWithCost(undefined), "cost-reserved", "<40")).toBe(
            false,
        );
    });
});
