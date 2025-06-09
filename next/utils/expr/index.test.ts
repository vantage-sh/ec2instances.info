import { describe, test, expect } from "vitest";
import exprCompiler from ".";

describe("tokenisation errors", () => {
    const exprTokenisationError = (expr: string, message: string) => {
        test(expr, () => {
            try {
                exprCompiler(expr);
            } catch (e) {
                if (e instanceof Error) {
                    expect(e.message).toEqual(message);
                } else {
                    throw e;
                }
            }
        });
    };

    const tests: [string, string][] = [
        // Incomplete expressions
        ["!", "Unexpected end of expression"],
        ["a ? b : ", "Unexpected end of expression"],
        ["a || ", "Unexpected end of expression"],
        ["a && ", "Unexpected end of expression"],
        ["1..", "Unexpected end of expression"],
        [">", "Unexpected end of expression"],
        [">=", "Unexpected end of expression"],
        ["<", "Unexpected end of expression"],
        ["<=", "Unexpected end of expression"],
        ["!!", "Unexpected ! at position 1"],

        // Parentheses and method calls
        ["(test", "Expected ) at position 5"],
        ["method(", "Unexpected end of expression"],
        ["method(1", "Expected ) at position 8"],
        ["method(1,", "Expected ) at position 8"],

        // Invalid characters and operators
        ["%", "Unexpected character % at position 0"],
        [".", "Unexpected character . at position 0"],
        ["a & b", "Unexpected character   at position 3"],
        ["a | b", "Unexpected character   at position 3"],

        // Range operator errors
        ["1..2", "Unexpected character . at position 1"],
        ["1.2.3", "Unexpected character . at position 3"],
        ["..2", "Unexpected . at position 0"],
        ["a..2", "Left side of range must be a number"],

        // Ternary operator errors
        ["a ? b", "Expected : at position 5"],

        // String literal errors
        ["'", "Unexpected end of string at position 1"],
        ["'\\'", "Unexpected end of string at position 3"],
        ["'test", "Unexpected end of string at position 5"],
        ['"', "Unexpected end of string at position 1"],
        ['"\\"', "Unexpected end of string at position 3"],
        ['"test', "Unexpected end of string at position 5"],
        ["`", "Unexpected end of string at position 1"],
        ["`\\`", "Unexpected end of string at position 3"],
        ["`test", "Unexpected end of string at position 5"],
    ];

    for (const [expr, message] of tests) {
        exprTokenisationError(expr, message);
    }
});

test("too complex expression", () => {
    const expr = "(((((((((((hi))))))))))))";
    expect(() => exprCompiler(expr)(1, "")).toThrow();
});

test("runtime method call error", () => {
    const v = exprCompiler("method(1)");
    try {
        v(1, "");
    } catch (e) {
        if (e instanceof Error) {
            expect(e.message).toEqual("Method method not found");
        } else {
            throw e;
        }
    }
});

describe("stdlib", () => {
    type StdlibTestCase = {
        method: string;
        cases: {
            name: string;
            arg: string | boolean | number | undefined;
            strValue: string;
            expected: boolean | string;
        }[];
    };
    const tests: StdlibTestCase[] = [
        {
            method: "starts_with",
            cases: [
                {
                    name: "string with prefix",
                    arg: "test",
                    strValue: "test123",
                    expected: true,
                },
                {
                    name: "string without prefix",
                    arg: "test",
                    strValue: "123test",
                    expected: false,
                },
                {
                    name: "string with number as prefix",
                    arg: 123,
                    strValue: "123test",
                    expected: true,
                },
                {
                    name: "string without number as prefix",
                    arg: 123,
                    strValue: "test123",
                    expected: false,
                },
                {
                    name: "string with boolean as prefix",
                    arg: true,
                    strValue: "true123",
                    expected: true,
                },
                {
                    name: "string without boolean as prefix",
                    arg: true,
                    strValue: "testtrue",
                    expected: false,
                },
                {
                    name: "called with no argument",
                    arg: undefined,
                    strValue: "test",
                    expected: "starts_with: value is undefined",
                },
            ],
        },

        {
            method: "ends_with",
            cases: [
                {
                    name: "string with suffix",
                    arg: "test",
                    strValue: "123test",
                    expected: true,
                },
                {
                    name: "string without suffix",
                    arg: "test",
                    strValue: "test123",
                    expected: false,
                },
                {
                    name: "string with number as suffix",
                    arg: 123,
                    strValue: "test123",
                    expected: true,
                },
                {
                    name: "string without number as suffix",
                    arg: 123,
                    strValue: "123test",
                    expected: false,
                },
                {
                    name: "string with boolean as suffix",
                    arg: true,
                    strValue: "testtrue",
                    expected: true,
                },
                {
                    name: "string without boolean as suffix",
                    arg: true,
                    strValue: "truetest",
                    expected: false,
                },
                {
                    name: "called with no argument",
                    arg: undefined,
                    strValue: "test",
                    expected: "ends_with: value is undefined",
                },
            ],
        },

        {
            method: "has",
            cases: [
                {
                    name: "string with substring",
                    arg: "test",
                    strValue: "test123",
                    expected: true,
                },
                {
                    name: "string without substring",
                    arg: "testing",
                    strValue: "123test",
                    expected: false,
                },
                {
                    name: "string with number as substring",
                    arg: 123,
                    strValue: "123test",
                    expected: true,
                },
                {
                    name: "string without number as substring",
                    arg: 123,
                    strValue: "test",
                    expected: false,
                },
                {
                    name: "string with boolean as substring",
                    arg: true,
                    strValue: "testtrue",
                    expected: true,
                },
                {
                    name: "string without boolean as substring",
                    arg: true,
                    strValue: "test",
                    expected: false,
                },
                {
                    name: "called with no argument",
                    arg: undefined,
                    strValue: "test",
                    expected: "has: value is undefined",
                },
            ],
        },

        {
            method: "ebs",
            cases: [
                {
                    name: "argument given",
                    arg: true,
                    strValue: "EBS",
                    expected: "Method requires no argument",
                },
                {
                    name: "value does not contain EBS",
                    arg: undefined,
                    strValue: "SSD",
                    expected: false,
                },
                {
                    name: "value contains EBS",
                    arg: undefined,
                    strValue: "aaaaEBSaaaa",
                    expected: true,
                },
            ],
        },

        {
            method: "nvme",
            cases: [
                {
                    name: "argument given",
                    arg: true,
                    strValue: "NVMe",
                    expected: "Method requires no argument",
                },
                {
                    name: "value does not contain NVMe",
                    arg: undefined,
                    strValue: "SSD",
                    expected: false,
                },
                {
                    name: "value contains NVMe",
                    arg: undefined,
                    strValue: "aaaaNVMeaaaa",
                    expected: true,
                },
            ],
        },

        {
            method: "ssd",
            cases: [
                {
                    name: "argument given",
                    arg: true,
                    strValue: "SSD",
                    expected: "Method requires no argument",
                },
                {
                    name: "value does not contain SSD",
                    arg: undefined,
                    strValue: "EBS",
                    expected: false,
                },
                {
                    name: "value contains SSD",
                    arg: undefined,
                    strValue: "aaaaSSDaaaa",
                    expected: true,
                },
            ],
        },

        {
            method: "hdd",
            cases: [
                {
                    name: "argument given",
                    arg: true,
                    strValue: "HDD",
                    expected: "Method requires no argument",
                },
                {
                    name: "value does not contain HDD",
                    arg: undefined,
                    strValue: "SSD",
                    expected: false,
                },
                {
                    name: "value contains HDD",
                    arg: undefined,
                    strValue: "aaaaHDDaaaa",
                    expected: true,
                },
            ],
        },
    ];

    for (const case_ of tests) {
        describe(case_.method, () => {
            for (const { name, arg, strValue, expected } of case_.cases) {
                test(name, () => {
                    const expr =
                        arg === undefined
                            ? case_.method
                            : `${case_.method}(${
                                  typeof arg === "string"
                                      ? JSON.stringify(arg)
                                      : typeof arg === "boolean"
                                        ? arg
                                            ? "has('')"
                                            : "has('does not exist')"
                                        : arg
                              })`;
                    const v = exprCompiler(expr);
                    if (typeof expected === "boolean") {
                        expect(v(1, strValue)).toEqual(expected);
                    } else {
                        expect(() => v(1, strValue)).toThrow(expected);
                    }
                });
            }
        });
    }
});

describe("valid syntax", () => {
    const noError = (expr: string, expected: boolean) => {
        test(expr, () => {
            expect(exprCompiler(expr)(1, "test")).toEqual(expected);
        });
    };

    const tests: [string, boolean][] = [
        // Numbers

        ["1", true],
        ["1.", true],
        ["1.0", true],
        [">.5", true],
        [">= .5", true],
        [".5", false],
        ["!.5", true],
        ["<.5", false],
        ["<=.5", false],
        [">=.5", true],
        [".5..2", true],
        [".5 .. 2", true],
        [" 1 ", true],

        // Logical operators

        ["1 && <2", true],
        [".5 || >.8", true],
        ["1 ? >.5 : <.5", true],
        ["2 ? >.5 : <.5", false],

        // Brackets

        ["(1) && <5", true],

        // String literals

        ["'test'", true],
        ["'not_eq'", false],
    ];

    for (const [expr, expected] of tests) {
        noError(expr, expected);
    }
});
