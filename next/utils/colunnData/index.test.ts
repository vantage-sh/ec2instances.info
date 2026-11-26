import { describe, expect, it } from "vitest";
import { cache, ec2, opensearch, rds, redshift } from ".";
import { costExpr } from "./shared";

const currency = { code: "USD", usdRate: 1, cnyRate: 1 };

function gen(provider: { columnsGen: (...args: any[]) => any[] }) {
    return provider.columnsGen(
        "us-east-1",
        "instance",
        "hourly",
        "auto",
        "yrTerm1Standard.noUpfront",
        currency,
    );
}

describe("cost column filters", () => {
    it.each(Object.entries({ cache, ec2, opensearch, rds, redshift }))(
        "%s cost columns filter by expression",
        (_, provider) => {
            const costColumns = gen(provider).filter((c) =>
                c.id?.startsWith("cost-"),
            );
            expect(costColumns.length).toBeGreaterThan(0);
            for (const c of costColumns) {
                expect(c.filterFn, c.id).toBe(costExpr);
            }
        },
    );

    it("keeps the text filter for spot interrupt rates", () => {
        const column = gen(ec2).find((c) => c.id === "spot-interrupt-rate");
        const original = {
            pricing: { "us-east-1": { linux: { pct_interrupt: ">20%" } } },
        };
        const row = {
            original,
            getValue: () => column.accessorFn(original, 0),
        } as any;

        expect(column.filterFn).not.toBe(costExpr);
        expect(column.filterFn(row, column.id, "20")).toBe(true);
        expect(column.filterFn(row, column.id, "5-10")).toBe(false);
    });
});
