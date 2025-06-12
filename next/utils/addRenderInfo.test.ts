import instance from "./mocks/ec2_single_instance.json";
import { test } from "vitest";
import addRenderInfo from "./addRenderInfo";

test("test this runs successfully", () => {
    addRenderInfo(instance as any);
});
