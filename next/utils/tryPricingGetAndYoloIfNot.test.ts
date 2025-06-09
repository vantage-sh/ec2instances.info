import { expect, describe, test } from "vitest";
import tryPricingGetAndYoloIfNot from "./tryPricingGetAndYoloIfNot";

const pricing = {
    "us-east-1": {
        linux: {
            ondemand: "100",
        },
        windows: {
            ondemand: "600",
        },
    },
    "us-west-1": {
        linux: {
            ondemand: "200",
        },
        windows: {
            ondemand: "500",
        },
    },
};

test("default to <default region> + linux pricing", () => {
    expect(tryPricingGetAndYoloIfNot(pricing, "us-east-1")).toBe("100");
});

function cloneDeep<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

describe("rolls to another item in default region", () => {
    test("zero ondemand pricing", () => {
        const cpy = cloneDeep(pricing);
        cpy["us-east-1"].linux.ondemand = "0";
        expect(tryPricingGetAndYoloIfNot(cpy, "us-east-1")).toBe("600");
    });

    test("undefined ondemand pricing", () => {
        const cpy = cloneDeep(pricing);
        // @ts-expect-error - we're testing undefined
        cpy["us-east-1"].linux.ondemand = undefined;
        expect(tryPricingGetAndYoloIfNot(cpy, "us-east-1")).toBe("600");
    });
});

test("default region is not present", () => {
    const cpy = cloneDeep(pricing);
    // @ts-expect-error - we're testing undefined
    delete cpy["us-east-1"];
    expect(tryPricingGetAndYoloIfNot(cpy, "us-east-1")).toBe("200");
});

test("empty pricing", () => {
    expect(tryPricingGetAndYoloIfNot({}, "us-east-1")).toBeUndefined();
});

test("return undefined if no pricing", () => {
    const cpy = cloneDeep(pricing);
    cpy["us-east-1"].linux.ondemand = "0";
    cpy["us-east-1"].windows.ondemand = "0";
    expect(tryPricingGetAndYoloIfNot(cpy, "us-east-1")).toBeUndefined();
});
