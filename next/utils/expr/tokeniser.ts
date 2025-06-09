type NumberToken = {
    type: "number";
    value: number;
};

export type Tokens =
    | {
          type: "brackets";
          inner: Tokens;
      }
    | {
          type: "or";
          left: Tokens;
          right: Tokens;
      }
    | {
          type: "and";
          left: Tokens;
          right: Tokens;
      }
    | {
          type: "not";
          inner: Tokens;
      }
    | NumberToken
    | {
          type: "gt";
          value: number;
      }
    | {
          type: "gte";
          value: number;
      }
    | {
          type: "lt";
          value: number;
      }
    | {
          type: "lte";
          value: number;
      }
    | {
          type: "range";
          start: number;
          end: number;
      }
    | {
          type: "ternary";
          condition: Tokens;
          true: Tokens;
          false: Tokens;
      }
    | {
          type: "string";
          value: string;
      }
    | {
          type: "method_call";
          methodName: string;
          arg?: Tokens;
      };

function parseNumber(value: string): number {
    if (value.startsWith(".")) {
        return parseFloat("0" + value);
    }
    if (value.endsWith(".")) {
        return parseFloat(value.slice(0, -1));
    }
    const n = parseInt(value, 10);
    if (isNaN(n)) {
        throw new Error(`Invalid number: ${value}`);
    }
    return n;
}

function tokeniseNumber(value: string, offset: number): [NumberToken, number] {
    let newOffset = offset;
    const r = () => {
        if (newOffset === offset) {
            throw new Error(
                "internal bug: tokeniseNumber called with no digits",
            );
        }
        return [
            {
                type: "number",
                value: parseNumber(value.slice(offset, newOffset)),
            },
            newOffset,
        ] as [NumberToken, number];
    };

    const d = () => {
        // Peak at the next character. If it's a dot, we are done, this is a range.
        if (value[newOffset + 1] === ".") {
            if (offset === newOffset) {
                throw new Error(`Unexpected . at position ${offset}`);
            }
            return r();
        }

        // Add 1 to the offset.
        newOffset++;
    };

    let dotToken: [NumberToken, number] | undefined;
    for (;;) {
        switch (value[newOffset]) {
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
                newOffset++;
                continue;
            case ".":
                dotToken = d();
                if (dotToken) return dotToken;
                continue;
            default:
                return r();
        }
    }
}

function unexpectedCharacter(value: string, offset: number): never {
    if (value[offset] === undefined) {
        throw new Error("Unexpected end of expression");
    }
    throw new Error(
        `Unexpected character ${value[offset]} at position ${offset}`,
    );
}

function tokeniseGtOrGteOrLtOrLte<TokenStart extends "gt" | "lt">(
    value: string,
    offsetAfterGtSymbol: number,
    start: TokenStart,
): [Tokens, number] {
    // Check if the next character is a =
    let gte = false;
    if (value[offsetAfterGtSymbol] === "=") {
        gte = true;
        offsetAfterGtSymbol++;
    }

    // Make sure the next character is a number
    gobble1: for (;;) {
        switch (value[offsetAfterGtSymbol]) {
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case ".":
                break gobble1;
            case " ":
            case "\t":
            case "\n":
            case "\r":
                offsetAfterGtSymbol++;
                continue;
            default:
                unexpectedCharacter(value, offsetAfterGtSymbol);
        }
    }

    // Parse the number
    const [token, newOffset] = tokeniseNumber(value, offsetAfterGtSymbol);
    return [
        {
            type: gte ? `${start}e` : `${start}`,
            value: token.value,
        },
        newOffset,
    ] as [Tokens, number];
}

function tokeniseRange(
    value: string,
    offset: number,
    left: Tokens,
): [Tokens, number] {
    // The offset should be another .
    if (value[offset] !== ".") unexpectedCharacter(value, offset);

    // Throw if the left is not a number
    if (left.type !== "number") {
        throw new Error("Left side of range must be a number");
    }

    // Add 1 to the offset, gobble whitespace, and make sure the next character is a number
    offset++;
    gobble1: for (;;) {
        switch (value[offset]) {
            case " ":
            case "\t":
            case "\n":
            case "\r":
                offset++;
                continue gobble1;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case ".":
                break gobble1;
            default:
                unexpectedCharacter(value, offset);
        }
    }

    // Parse the number
    const [token, newOffset] = tokeniseNumber(value, offset);
    return [
        {
            type: "range",
            start: left.value,
            end: token.value,
        },
        newOffset,
    ] as [Tokens, number];
}

function tokeniseString(
    value: string,
    offset: number,
    quote: string,
): [Tokens, number] {
    const content: string[] = [];
    let inEscape = false;
    for (; offset < value.length; offset++) {
        if (inEscape) {
            // If we are in an escape sequence, just add the character to the content.
            inEscape = false;
            content.push(value[offset]);
            continue;
        }

        switch (value[offset]) {
            case "\\":
                inEscape = true;
                break;
            case quote:
                offset++;
                return [
                    {
                        type: "string",
                        value: content.join(""),
                    },
                    offset,
                ] as [Tokens, number];
            default:
                content.push(value[offset]);
        }
    }
    throw new Error(`Unexpected end of string at position ${offset}`);
}

function isAlpha(value: string, offset: number): boolean {
    const charCode = value.charCodeAt(offset);
    return (
        (charCode >= 65 && charCode <= 90) ||
        charCode === 95 ||
        (charCode >= 97 && charCode <= 122)
    );
}

function gobbleWhitespace(value: string, offset: number): number {
    for (;;) {
        switch (value[offset]) {
            case " ":
            case "\t":
            case "\n":
            case "\r":
                offset++;
                break;
            default:
                return offset;
        }
    }
}

function tokeniseBase(
    value: string,
    offset: number,
    depth: number,
): [Tokens, number] {
    if (depth > 10) {
        throw new Error("Expression too complex");
    }
    if (value[offset] === undefined) {
        throw new Error("Unexpected end of expression");
    }

    let notMode: number | null = null;
    let token: Tokens;
    const consumeEndBracket = (value: string) => {
        if (value[offset] !== ")") {
            throw new Error(`Expected ) at position ${offset}`);
        }
        offset++;
    };
    parse1: for (;;) {
        switch (value[offset]) {
            case "(":
                [token, offset] = tokeniseBase(value, offset + 1, depth + 1);
                consumeEndBracket(value);
                break;
            case "!":
                if (notMode !== null) {
                    throw new Error(`Unexpected ! at position ${offset}`);
                }
                notMode = offset;
                offset++;
                continue parse1;
            case " ":
            case "\t":
            case "\n":
            case "\r":
                offset++;
                continue parse1;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case ".":
                [token, offset] = tokeniseNumber(value, offset);
                break;
            case ">":
                [token, offset] = tokeniseGtOrGteOrLtOrLte(
                    value,
                    offset + 1,
                    "gt",
                );
                break;
            case "<":
                [token, offset] = tokeniseGtOrGteOrLtOrLte(
                    value,
                    offset + 1,
                    "lt",
                );
                break;
            case "'":
            case '"':
            case "`":
                [token, offset] = tokeniseString(
                    value,
                    offset + 1,
                    value[offset],
                );
                break;
            default:
                if (isAlpha(value, offset)) {
                    // Likely a method call
                    [token, offset] = tokeniseMethodCall(
                        value,
                        offset,
                        depth + 1,
                    );
                } else {
                    // This is just invalid syntax
                    unexpectedCharacter(value, offset);
                }
        }
        break;
    }

    // Not mode is always to the left token
    if (notMode !== null) {
        token = {
            type: "not",
            inner: token,
        };
    }

    joiners: for (;;) {
        offset = gobbleWhitespace(value, offset);

        // Look ahead for a or/and/range
        switch (value[offset]) {
            case "|":
                [token, offset] = tokeniseJoiner(
                    value,
                    token,
                    offset + 1,
                    depth + 1,
                    "or",
                    "|",
                );
                break;
            case "&":
                [token, offset] = tokeniseJoiner(
                    value,
                    token,
                    offset + 1,
                    depth + 1,
                    "and",
                    "&",
                );
                break;
            case "?":
                [token, offset] = tokeniseTernary(
                    value,
                    offset + 1,
                    depth + 1,
                    token,
                );
                break;
            case ".":
                [token, offset] = tokeniseRange(value, offset + 1, token);
                break;
            default:
                break joiners;
        }
    }

    offset = gobbleWhitespace(value, offset);

    if (depth === 0) {
        // Make sure the expression is complete
        if (value[offset] !== undefined) unexpectedCharacter(value, offset);
    }

    return [token, offset];
}

function tokeniseMethodCall(
    value: string,
    offset: number,
    depth: number,
): [Tokens, number] {
    // Fast forward to the end of the method name
    const start = offset;
    for (; offset < value.length; offset++) {
        if (!isAlpha(value, offset)) break;
    }
    const end = offset;

    // Gobble up whitespace
    offset = gobbleWhitespace(value, offset);

    // Handle if there is an argument
    let arg: Tokens | undefined;
    if (value[offset] === "(") {
        [arg, offset] = tokeniseBase(value, offset + 1, depth);
        if (value[offset] !== ")") {
            throw new Error(`Expected ) at position ${offset}`);
        }
        offset++;
    }

    // Return the token.
    return [
        {
            type: "method_call",
            methodName: value.slice(start, end),
            arg,
        },
        offset,
    ] as [Tokens, number];
}

function tokeniseTernary(
    value: string,
    offset: number,
    depth: number,
    condition: Tokens,
): [Tokens, number] {
    // Get the true case.
    let trueCase: Tokens;
    [trueCase, offset] = tokeniseBase(value, offset, depth);

    // Find the :
    if (value[offset] !== ":") {
        throw new Error(`Expected : at position ${offset}`);
    }
    offset++;

    // Get the false case.
    let falseCase: Tokens;
    [falseCase, offset] = tokeniseBase(value, offset, depth);

    // Return the token.
    return [
        {
            type: "ternary",
            condition,
            true: trueCase,
            false: falseCase,
        },
        offset,
    ] as [Tokens, number];
}

function tokeniseJoiner(
    value: string,
    left: Tokens,
    offsetAfterFirstJoiner: number,
    depth: number,
    type: "or" | "and",
    joiner: "|" | "&",
): [Tokens, number] {
    // Make sure the second joiner is there
    if (value[offsetAfterFirstJoiner] !== joiner) {
        throw new Error(
            `Unexpected character ${value[offsetAfterFirstJoiner]} at position ${offsetAfterFirstJoiner}`,
        );
    }

    // Parse the right hand side
    const [right, newOffset] = tokeniseBase(
        value,
        offsetAfterFirstJoiner + 1,
        depth,
    );

    return [
        {
            type,
            left,
            right,
        },
        newOffset,
    ] as [Tokens, number];
}

export const tokenise = (value: string) => tokeniseBase(value, 0, 0)[0];
