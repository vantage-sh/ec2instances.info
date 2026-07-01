/**
 * Format a number as currency using the given locale and currency code.
 * Both locale and currency are passed as arguments (framework-agnostic).
 *
 * @param value    The numeric value to format.
 * @param locale   BCP 47 locale tag (e.g. "en-US", "de", "zh-CN").
 * @param currency ISO 4217 currency code (e.g. "USD", "EUR", "CNY").
 * @param options  Optional overrides for Intl.NumberFormat (style and currency
 *                 are always set and cannot be overridden here).
 */
export function formatCurrency(
    value: number,
    locale: string,
    currency: string,
    options: Omit<Intl.NumberFormatOptions, "style" | "currency"> = {},
): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        ...options,
    }).format(value);
}

/**
 * Format a plain number using the given locale (no currency style).
 *
 * @param value   The numeric value to format.
 * @param locale  BCP 47 locale tag.
 * @param options Optional Intl.NumberFormat options.
 */
export function formatNumber(
    value: number,
    locale: string,
    options: Intl.NumberFormatOptions = {},
): string {
    return new Intl.NumberFormat(locale, options).format(value);
}
