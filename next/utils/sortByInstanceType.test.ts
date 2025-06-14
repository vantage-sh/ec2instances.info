import sortByInstanceType from "./sortByInstanceType";
import { describe, test, expect } from "vitest";

const mockInstanceTypes = [
    "a1.medium",
    "a1.small",
    "a1.xlarge",
    "a2.medium",
    "a2.small",
    "a2.xlarge",
    "a2.2xlarge",
    "a2.4xlarge",
    "a1.2xlarge",
    "b1.medium",
    "b1.small",
    "a2.metal",
    "b1.xlarge",
];

const expectedSorted = [
    "a1.small",
    "a1.medium",
    "a1.xlarge",
    "a1.2xlarge",
    "a2.small",
    "a2.medium",
    "a2.xlarge",
    "a2.2xlarge",
    "a2.4xlarge",
    "a2.metal",
    "b1.small",
    "b1.medium",
    "b1.xlarge",
];

describe("instances are sorted", () => {
    test("no cut prefix", () => {
        const cpy = [...mockInstanceTypes];
        cpy.sort((a, b) => sortByInstanceType(a, b, "."));
        expect(cpy).toEqual(expectedSorted);
    });

    test("cut prefix", () => {
        const cpy = [...mockInstanceTypes];
        for (let i = 0; i < cpy.length; i++) {
            const random = Math.random();
            if (random < 0.5) {
                cpy[i] = `PREFIX-${cpy[i]}`;
            }
        }
        cpy.sort((a, b) => sortByInstanceType(a, b, ".", "PREFIX-"));
        expect(cpy.map((i) => i.replace("PREFIX-", ""))).toEqual(
            expectedSorted,
        );
    });
});
