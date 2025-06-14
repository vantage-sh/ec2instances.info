import { describe, it, expect } from "vitest";
import formatAzureInstanceType from "./formatAzureInstanceType";

describe("formatAzureInstanceType", () => {
    it("should format non-NV instance types by adding a hyphen before v", () => {
        const instance = { instance_type: "Standard_D2sv3" };
        formatAzureInstanceType(instance);
        expect(instance.instance_type).toBe("Standard_D2s-v3");
    });

    it("should format NV instance types by adding a hyphen after s", () => {
        const instance = { instance_type: "Standard_NV12sv3" };
        formatAzureInstanceType(instance);
        expect(instance.instance_type).toBe("Standard_NV12s-v3");
    });

    it("should not modify instance types that do not contain v", () => {
        const instance = { instance_type: "Standard_D2s" };
        formatAzureInstanceType(instance);
        expect(instance.instance_type).toBe("Standard_D2s");
    });
});
