import { Tokens, tokenise } from "./tokeniser";
import methods from "./methods";

function evaluate(token: Tokens, num: number, strValue: string): boolean {
    if (isNaN(num)) num = 0;
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
                a = evaluate(token.left, num, strValue);
                b = evaluate(token.right, num, strValue);
                return a || b;
            case "and":
                // Evaluate the left and right sides
                a = evaluate(token.left, num, strValue);
                b = evaluate(token.right, num, strValue);
                return a && b;
            case "not":
                // Evaluate the inner side
                a = evaluate(token.inner, num, strValue);
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
                return evaluate(token.condition, num, strValue)
                    ? evaluate(token.true, num, strValue)
                    : evaluate(token.false, num, strValue);
            case "string":
                return strValue === token.value;
            case "method_call":
                return doMethodCall(token.methodName, token.arg, num, strValue);
        }
    }
}

function doMethodCall(
    methodName: string,
    arg: Tokens | undefined,
    num: number,
    strValue: string,
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
            // the ! is needed because TS doesn't seem to understand that ? will mean the undefined case will be hit.
            resolved = evaluate(arg!, num, strValue);
    }
    const method = methods[methodName.toLowerCase() as keyof typeof methods];
    if (!method) {
        throw new Error(`Method ${methodName} not found`);
    }
    return method(resolved, strValue);
}

export default (value: string) => {
    // If the value is empty or only whitespace, return a function that always returns true (no filtering)
    if (!value.trim()) {
        return () => true;
    }
    const tokens = tokenise(value);
    return (num: number, strValue: string) => evaluate(tokens, num, strValue);
};
