import { expect, test } from "vitest";
import isAvailableInRegion from "./isAvailableInRegion";

// Reproduces the real scenario from issue #908: m8i.2xlarge is not offered in
// eu-north-1 (Stockholm), so the scraper emits no pricing entry for that region.
// The listing table must treat it as unavailable there (and hide it), while the
// detail page already shows the region as disabled.
const m8i2xlarge = {
    instance_type: "m8i.2xlarge",
    pricing: {
        "us-east-1": {
            linux: { ondemand: "0.4032" },
            mswin: { ondemand: "0.776" },
        },
        "eu-west-1": {
            linux: { ondemand: "0.4435" },
        },
        // Intentionally no "eu-north-1" entry: not offered in Stockholm.
    },
};

test("instance offered in the selected region is available", () => {
    expect(isAvailableInRegion(m8i2xlarge, "us-east-1")).toBe(true);
    expect(isAvailableInRegion(m8i2xlarge, "eu-west-1")).toBe(true);
});

test("instance not offered in the selected region is unavailable", () => {
    // This is the assertion that fails before the fix is wired into the table:
    // the instance must be reported as unavailable in eu-north-1.
    expect(isAvailableInRegion(m8i2xlarge, "eu-north-1")).toBe(false);
});

test("empty region pricing object counts as unavailable", () => {
    const instance = {
        instance_type: "foo.large",
        pricing: {
            "us-east-1": { linux: { ondemand: "1" } },
            "eu-north-1": {},
        },
    };
    expect(isAvailableInRegion(instance, "eu-north-1")).toBe(false);
});

test("instances without a pricing map are never filtered out", () => {
    expect(isAvailableInRegion({ instance_type: "bar" }, "eu-north-1")).toBe(
        true,
    );
    expect(
        isAvailableInRegion({ instance_type: "bar", pricing: {} }, "us-east-1"),
    ).toBe(true);
});

// RDS nests an extra engine/version level under the region key. The region key
// is still absent when the instance is not offered, so the presence check holds.
test("handles the nested RDS pricing shape", () => {
    const rdsInstance = {
        instance_type: "db.m5.large",
        pricing: {
            "us-east-1": {
                "2": { ondemand: "0.1" },
                "14": { ondemand: "0.2" },
            },
        },
    };
    expect(isAvailableInRegion(rdsInstance, "us-east-1")).toBe(true);
    expect(isAvailableInRegion(rdsInstance, "eu-north-1")).toBe(false);
});
