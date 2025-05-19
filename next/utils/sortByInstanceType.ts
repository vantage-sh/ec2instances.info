const PREFIXES = [
    "nano",
    "micro",
    "small",
    "medium",
    "large",
    "xlarge",
    "metal",
];

function sortSize(a: string, b: string) {
    const aPrefix = PREFIXES.findIndex((p) => a.startsWith(p));
    const bPrefix = PREFIXES.findIndex((p) => b.startsWith(p));
    if (aPrefix === bPrefix) {
        return a.localeCompare(b, undefined, { numeric: true });
    }
    return aPrefix - bPrefix;
}

const SIZE_START = /^(\d*)(.+?)$/;

export default function sortByInstanceType(
    a: string,
    b: string,
    divider: string,
    cutPrefix: string = "",
) {
    if (cutPrefix) {
        // Cut the prefix from the instance type.
        if (a.startsWith(cutPrefix)) {
            a = a.slice(cutPrefix.length);
        }
        if (b.startsWith(cutPrefix)) {
            b = b.slice(cutPrefix.length);
        }
    }

    // Firstly, sort by family.
    const [aFamily, aRemainder] = a.split(divider, 2);
    const [bFamily, bRemainder] = b.split(divider, 2);
    if (aFamily !== bFamily) {
        return aFamily.localeCompare(bFamily, undefined, {
            numeric: true,
            sensitivity: "accent",
        });
    }

    // Secondly, split by number and then the size of the instance.
    const [, aNumber, aSize] = aRemainder.match(SIZE_START)!;
    const [, bNumber, bSize] = bRemainder.match(SIZE_START)!;
    const aAsNumber = aNumber === "" ? 0 : Number(aNumber);
    const bAsNumber = bNumber === "" ? 0 : Number(bNumber);

    // If the size is the same, sort by the number.
    if (aSize === bSize) {
        return aAsNumber - bAsNumber;
    }

    // Otherwise, sort by the size.
    return sortSize(aSize, bSize);
}
