type MethodMap = {
    [key: string]: (
        arg: string | boolean | number | undefined,
        strValue: string,
    ) => boolean;
};

function hasFixed(name: string) {
    const method: MethodMap[string] = (
        arg: string | boolean | number | undefined,
        strValue: string,
    ) => {
        if (arg !== undefined) throw new Error("Method requires no argument");
        return strValue.includes(name);
    };
    return method;
}

export default {
    // String methods

    starts_with: (arg, strValue) => {
        if (arg === undefined)
            throw new Error("starts_with: value is undefined");
        return strValue.startsWith(String(arg));
    },
    has: (arg, strValue) => {
        if (arg === undefined) throw new Error("has: value is undefined");
        return strValue.includes(String(arg));
    },
    ends_with: (arg, strValue) => {
        if (arg === undefined) throw new Error("ends_with: value is undefined");
        return strValue.endsWith(String(arg));
    },

    // Helper methods

    ebs: hasFixed("EBS"),
    nvme: hasFixed("NVMe"),
    ssd: hasFixed("SSD"),
    hdd: hasFixed("HDD"),
} satisfies MethodMap;
