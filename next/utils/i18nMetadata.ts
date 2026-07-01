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
export function buildI18nMetadata(
    pathname: string,
    locale: string,
): {
    alternates: {
        canonical: string;
        languages: Record<string, string>;
    };
    ogLocale: string;
} {
    const rawBase = process.env.NEXT_PUBLIC_URL ?? "";
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
        ogLocale: locale,
    };
}
