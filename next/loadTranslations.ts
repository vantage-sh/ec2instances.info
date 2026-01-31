export default async function loadTranslations(
    targetLocale: string,
): Promise<Record<string, unknown> | null> {
    try {
        const [common, filters, errors, pricing, columns] = await Promise.all([
            import(`./translations/${targetLocale}/common.json`),
            import(`./translations/${targetLocale}/filters.json`),
            import(`./translations/${targetLocale}/errors.json`),
            import(`./translations/${targetLocale}/pricing.json`),
            import(`./translations/${targetLocale}/columns.json`),
        ]);
        return {
            ...common.default,
            filters: filters.default,
            errors: errors.default,
            pricing: pricing.default,
            columns: columns.default,
        };
    } catch {
        return null;
    }
}
