import { describe, expect, test } from "vitest";
import {
    commitmentTypeLabel,
    databaseSavingsPlanSupported,
    ML_SAVINGS_PLAN,
    reservedTermOptions,
    sageMakerSavingsPlanSupported,
} from "./dataMappings";

describe("database savings plans", () => {
    test("databaseSavingsPlanSupported builds a database dropdown option", () => {
        const options = reservedTermOptions([...databaseSavingsPlanSupported]);
        const databaseOption = options.find(
            (o) => o.value === "yrTerm1DatabaseSavings.noUpfront",
        );
        expect(databaseOption).toEqual({
            value: "yrTerm1DatabaseSavings.noUpfront",
            label: "1-year Database Savings Plan - No Upfront",
            group: "Database Savings Plan",
        });
    });

    test("commitmentTypeLabel recognizes savings plan term keys", () => {
        expect(commitmentTypeLabel("yrTerm1DatabaseSavings.noUpfront")).toBe(
            "Database Savings Plan",
        );
        expect(commitmentTypeLabel("DatabaseSavings.noUpfront")).toBe(
            "Database Savings Plan",
        );
        expect(commitmentTypeLabel("yrTerm1Savings.noUpfront")).toBe(
            "Compute Savings Plan",
        );
        expect(commitmentTypeLabel("yrTerm1MLSavings.noUpfront")).toBe(
            "ML Savings Plan",
        );
    });

    test("sageMakerSavingsPlanSupported builds ML savings dropdown options", () => {
        const options = reservedTermOptions([...sageMakerSavingsPlanSupported]);
        const mlOption = options.find(
            (o) => o.value === "yrTerm1MLSavings.noUpfront",
        );
        expect(mlOption).toEqual({
            value: "yrTerm1MLSavings.noUpfront",
            label: "1-year ML Savings Plan - No Upfront",
            group: ML_SAVINGS_PLAN,
        });
        expect(
            options.some((o) => o.value === "yrTerm1Savings.noUpfront"),
        ).toBe(false);
    });
});
