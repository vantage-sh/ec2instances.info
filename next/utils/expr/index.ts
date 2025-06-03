import { Tokens, tokenise } from "./tokeniser";

type MethodMap = {
    [key: string]: (
        value: string | boolean | number | undefined,
        strValue: string,
    ) => boolean;
};

function evaluate(
    token: Tokens,
    num: number,
    strValue: string,
    methods: MethodMap,
): boolean {
    let a: boolean;
    let b: boolean;
    for (;;) {
        switch (token.type) {
            case "brackets":
                // Unneeded brackets.
                token = token.inner;
                continue;
            case "or":
                // Evaluate the left and right sides
                a = evaluate(token.left, num, strValue, methods);
                b = evaluate(token.right, num, strValue, methods);
                return a || b;
            case "and":
                // Evaluate the left and right sides
                a = evaluate(token.left, num, strValue, methods);
                b = evaluate(token.right, num, strValue, methods);
                return a && b;
            case "not":
                // Evaluate the inner side
                a = evaluate(token.inner, num, strValue, methods);
                return !a;
            case "number":
                return num === token.value;
            case "gt":
                return num > token.value;
            case "gte":
                return num >= token.value;
            case "lt":
                return num < token.value;
            case "lte":
                return num <= token.value;
            case "range":
                return num >= token.start && num <= token.end;
            case "ternary":
                return evaluate(token.condition, num, strValue, methods)
                    ? evaluate(token.true, num, strValue, methods)
                    : evaluate(token.false, num, strValue, methods);
            case "string":
                return strValue === token.value;
            case "method_call":
                return doMethodCall(
                    token.methodName,
                    token.arg,
                    num,
                    strValue,
                    methods,
                );
        }
    }
}

function doMethodCall(
    methodName: string,
    arg: Tokens | undefined,
    num: number,
    strValue: string,
    methods: MethodMap,
): boolean {
    let resolved: string | boolean | number | undefined;
    switch (arg?.type) {
        case undefined:
            // Ignore.
            break;
        case "number":
            resolved = arg.value;
            break;
        case "string":
            resolved = arg.value;
            break;
        default:
            resolved = evaluate(arg!, num, strValue, methods);
    }
    const method = methods[methodName];
    if (!method) {
        throw new Error(`Method ${methodName} not found`);
    }
    return method(resolved, strValue);
}

export default (value: string, methods: MethodMap) => {
    // If the value is empty or only whitespace, return a function that always returns true (no filtering)
    if (!value.trim()) {
        return () => true;
    }
    const tokens = tokenise(value);
    return (num: number, strValue: string) =>
        evaluate(tokens, num, strValue, methods);
};
