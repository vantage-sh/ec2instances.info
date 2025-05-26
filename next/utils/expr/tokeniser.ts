type TokenBase = {
    startPos: number;
};

export type Tokens = TokenBase &
    (
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
        | {
              type: "number";
              value: number;
          }
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
    );

type NumberToken = TokenBase & {
    type: "number";
    value: number;
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
            startPos: offsetAfterGtSymbol - 1,
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
    let newOffset = offset;
    const consumeEndBracket = (value: string) => {
        if (value[newOffset] !== ")") {
            throw new Error(`Expected ) at position ${newOffset}`);
        }
        newOffset++;
    };
    parse1: for (;;) {
        switch (value[newOffset]) {
            case "(":
                [token, newOffset] = tokeniseBase(
                    value,
                    newOffset + 1,
                    depth + 1,
                );
                consumeEndBracket(value);
                break;
            case "!":
                if (notMode !== null) {
                    throw new Error(`Unexpected ! at position ${newOffset}`);
                }
                notMode = newOffset;
                newOffset++;
                continue parse1;
            case " ":
            case "\t":
            case "\n":
            case "\r":
                newOffset++;
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
                [token, newOffset] = tokeniseNumber(value, newOffset);
                break;
            case ">":
                [token, newOffset] = tokeniseGtOrGteOrLtOrLte(
                    value,
                    newOffset + 1,
                    "gt",
                );
                break;
            case "<":
                [token, newOffset] = tokeniseGtOrGteOrLtOrLte(
                    value,
                    newOffset + 1,
                    "lt",
                );
                break;
            default:
                unexpectedCharacter(value, offset);
        }
        break;
    }

    // Not mode is always to the left token
    if (notMode !== null) {
        token = {
            type: "not",
            inner: token,
            startPos: notMode,
        };
    }

    joiners: for (;;) {
        // Gobble up whitespace
        gobble1: for (;;) {
            switch (value[newOffset]) {
                case " ":
                case "\t":
                case "\n":
                case "\r":
                    newOffset++;
                    continue;
                default:
                    break gobble1;
            }
        }

        // Look ahead for a or/and/range
        switch (value[newOffset]) {
            case "|":
                [token, newOffset] = tokeniseJoiner(
                    value,
                    token,
                    newOffset + 1,
                    depth + 1,
                    "or",
                    "|",
                );
                break;
            case "&":
                [token, newOffset] = tokeniseJoiner(
                    value,
                    token,
                    newOffset + 1,
                    depth + 1,
                    "and",
                    "&",
                );
                break;
            case ".":
                [token, newOffset] = tokeniseRange(value, newOffset + 1, token);
                break;
            default:
                break joiners;
        }
    }

    // Gobble up whitespace
    gobble2: for (;;) {
        switch (value[newOffset]) {
            case " ":
            case "\t":
            case "\n":
            case "\r":
                newOffset++;
                continue;
            default:
                break gobble2;
        }
    }

    if (depth === 0) {
        // Make sure the expression is complete
        if (value[newOffset] !== undefined)
            unexpectedCharacter(value, newOffset);
    }

    return [token, newOffset];
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
            `Expected ${value[offsetAfterFirstJoiner]} at position ${offsetAfterFirstJoiner}`,
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
