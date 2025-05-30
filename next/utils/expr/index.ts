import { Tokens, tokenise } from "./tokeniser";

function evaluate(token: Tokens, num: number): boolean {
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
                a = evaluate(token.left, num);
                b = evaluate(token.right, num);
                return a || b;
            case "and":
                // Evaluate the left and right sides
                a = evaluate(token.left, num);
                b = evaluate(token.right, num);
                return a && b;
            case "not":
                // Evaluate the inner side
                a = evaluate(token.inner, num);
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
        }
    }
}

export default (value: string) => {
    // If the value is empty or only whitespace, return a function that always returns true (no filtering)
    if (!value.trim()) {
        return () => true;
    }
    const tokens = tokenise(value);
    return (num: number) => evaluate(tokens, num);
};
