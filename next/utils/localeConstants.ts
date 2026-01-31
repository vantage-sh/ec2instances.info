export type SupportedLocale =
    | "en-GB"
    | "en-US"
    | "sv"
    | "de"
    | "zh-CN"
    | "zh-TW"
    | "ja"
    | "he"
    | "ar";

export const SUPPORTED_LOCALES: SupportedLocale[] = [
    "en-GB",
    "en-US",
    "sv",
    "de",
    "zh-CN",
    "zh-TW",
    "ja",
    "he",
    "ar",
];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
    "en-GB": "English (UK)",
    "en-US": "English (US)",
    sv: "Svenska",
    de: "Deutsch",
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",
    ja: "日本語",
    he: "עברית",
    ar: "العربية",
};

export const DEFAULT_LOCALE: SupportedLocale = "en-GB";

export const RTL_LOCALES: SupportedLocale[] = ["ar", "he"];

export function isRTL(locale: string): boolean {
    return RTL_LOCALES.includes(locale as SupportedLocale);
}
