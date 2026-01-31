import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from "./localeConstants";

/**
 * Extract the locale from a pathname.
 * Returns the locale if found, otherwise returns the default locale.
 */
export function getLocaleFromPath(pathname: string): SupportedLocale {
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];
    if (firstSegment && SUPPORTED_LOCALES.includes(firstSegment as SupportedLocale)) {
        return firstSegment as SupportedLocale;
    }
    return DEFAULT_LOCALE;
}

/**
 * Strip the locale prefix from a pathname.
 * This is useful for state management where we want to share state across locales.
 */
export function stripLocaleFromPath(pathname: string): string {
    const locale = getLocaleFromPath(pathname);
    return pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
}

/**
 * Prefix a path with a locale.
 * If the path already has a locale prefix, it will be replaced.
 */
export function prefixWithLocale(path: string, locale: string): string {
    // First strip any existing locale
    const strippedPath = stripLocaleFromPath(path);
    // Then add the new locale prefix
    if (strippedPath === "/") {
        return `/${locale}`;
    }
    return `/${locale}${strippedPath}`;
}
