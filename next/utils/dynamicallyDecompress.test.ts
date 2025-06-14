import { expect, test } from "vitest";
import instance from "./mocks/ec2_single_instance.json";
import makeRainbowTable from "./makeRainbowTable";
import dynamicallyDecompress from "./dynamicallyDecompress";

test("dynamically decompresses", () => {
    const [rainbowTable, first] = makeRainbowTable([{ ...instance }]);
    // @ts-expect-error: First item is special
    const decompressed = dynamicallyDecompress(first, rainbowTable);
    decompressed.pricing;
    expect(decompressed).toEqual(instance);
});
