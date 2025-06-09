import { expect, test } from "vitest";
import {
    decompressHalfRainbowTable,
    makeHalfRainbowTable,
} from "./halfRainbowTable";

const pricing = {
    "us-east-1": {
        ondemand: 1,
        reserved: {
            "1-year": 1,
        },
    },
    "us-west-1": {
        ondemand: 2,
        reserved: {
            "1-year": 2,
        },
    },
};

test("compress and decompresses successfully", () => {
    const [table, a] = makeHalfRainbowTable([{ pricing }]);
    const decompressed = decompressHalfRainbowTable(table, a);
    decompressHalfRainbowTable(table, a);
    expect(decompressed).toEqual({ pricing, _decmp: true });
});
