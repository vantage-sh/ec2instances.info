import type { DescriptionTranslator } from "./buildInstanceDescription";

/**
 * Creates a translation function backed by an already-resolved dictionary
 * object, for contexts where gt-next's `getTranslations()` cannot resolve a
 * locale from the request (e.g. the standalone llms build script). It supports
 * dotted keys and `{placeholder}` interpolation, matching gt-next's dictionary
 * lookups for the simple variable templates used here.
 */
export default function makeDictionaryTranslator(
    dictionary: Record<string, unknown>,
): DescriptionTranslator {
    return (key, vars) => {
        const value = key
            .split(".")
            .reduce<unknown>(
                (node, part) =>
                    node && typeof node === "object"
                        ? (node as Record<string, unknown>)[part]
                        : undefined,
                dictionary,
            );
        if (typeof value !== "string") return key;
        return value.replace(/\{(\w+)\}/g, (_, name) =>
            vars && name in vars ? String(vars[name]) : `{${name}}`,
        );
    };
}
