import makeRainbowTable from "./makeRainbowTable";
import processRainbowTable from "./processRainbowTable";
import { test, expect } from "vitest";

const expected = {
    earth: {
        linux: {
            ondemand: 0.1,
            reserved: {
                "1yr": 0.08,
                "3yr": 0.06,
            },
        },
        freebsd: {
            ondemand: 0.09,
            reserved: {
                "1yr": 0.07,
                "3yr": 0.05,
            },
        },
    },
    uk: {
        linux: {
            ondemand: 0.1,
            reserved: {
                "1yr": 0.08,
                "3yr": 0.06,
            },
        },
        windows: {
            ondemand: 0.15,
            reserved: {
                "1yr": 0.12,
                "3yr": 0.09,
            },
        },
        windows2: {
            ondemand: 0.15,
            reserved: {
                "1yr": 0.12,
                "3yr": 0.09,
            },
        },
        noreserved: {
            ondemand: 0.15,
        },
        nullreserved: {
            ondemand: 0.15,
            reserved: null,
        },
    },
};

const nullReplaced = {
    ...expected,
    uk: {
        ...expected.uk,
        nullreserved: {
            ...expected.uk.nullreserved,
            reserved: {},
        },
    },
};

test("makeRainbowTable makes correct data and processRainbowTable processes pricing data correctly", () => {
    const result = makeRainbowTable([
        {
            pricing: { ...expected },
        },
        {
            pricing: { ...expected },
        },
    ]);
    const [first, ...rest] = result;

    // First item should be a string array.
    expect(Array.isArray(first)).toBe(true);
    expect((first as string[]).every((item) => typeof item === "string")).toBe(
        true,
    );

    // Attempt to decode the rest.
    // @ts-expect-error: This is intentionally the wrong type.
    const decoded = processRainbowTable(first, rest[0]);
    expect(decoded).toEqual({ pricing: nullReplaced });
});
