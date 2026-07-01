import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./localeConstants";
import { prefixWithLocale } from "./locale";

/**
 * Builds Next.js Metadata alternates (canonical URL + hreflang language map)
 * and an openGraph locale string for a given page and active locale.
 *
 * @param pathname - Locale-stripped pathname (e.g. "/aws/ec2/t3.micro" or "/rds")
 * @param locale   - The current locale (e.g. "en-GB")
 * @returns An object with `alternates` (canonical + languages) and `ogLocale`.
 *          Spread `alternates` directly into Metadata; merge `ogLocale` into
 *          the `openGraph.locale` field alongside any existing openGraph props.
 */
/**
 * Convert a BCP 47 locale tag to the OpenGraph `ll_CC` format.
 *
 * - `xx-YY` → `xx_YY` (replace hyphen with underscore)
 * - bare `xx` (2-letter ISO 639-1) → left as-is
 * - anything else (3-letter ISO 639-3, non-standard codes) → undefined
 *   (callers must omit `og:locale` for these to avoid emitting an invalid value)
 */
function toOgLocale(locale: string): string | undefined {
    if (/^[a-z]{2}-[A-Z]{2}$/.test(locale)) {
        return locale.replace("-", "_");
    }
    if (/^[a-z]{2}$/.test(locale)) {
        return locale;
    }
    return undefined;
}

export function buildI18nMetadata(
    pathname: string,
    locale: string,
): {
    alternates: {
        canonical: string;
        languages: Record<string, string>;
    };
    ogLocale: string | undefined;
} {
    const rawBase = process.env.NEXT_PUBLIC_URL;
    if (!rawBase) {
        throw new Error(
            "NEXT_PUBLIC_URL is not set. Set it to the site's base URL (e.g. https://ec2instances.info).",
        );
    }
    const base = rawBase.replace(/\/$/, "");

    const makeUrl = (l: string): string =>
        `${base}${prefixWithLocale(pathname, l)}`;

    const languages: Record<string, string> = {};
    for (const l of SUPPORTED_LOCALES) {
        languages[l] = makeUrl(l);
    }
    languages["x-default"] = makeUrl(DEFAULT_LOCALE);

    return {
        alternates: {
            canonical: makeUrl(locale),
            languages,
        },
        ogLocale: toOgLocale(locale),
    };
}
