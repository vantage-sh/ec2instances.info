import {
    Inter,
    Noto_Sans_Arabic,
    Noto_Sans_Hebrew,
    Noto_Sans_SC,
    Noto_Sans_TC,
    Noto_Sans_JP,
} from "next/font/google";

// Re-export locale constants for backward compatibility
export {
    type SupportedLocale,
    SUPPORTED_LOCALES,
    LOCALE_NAMES,
    DEFAULT_LOCALE,
    RTL_LOCALES,
    isRTL,
} from "./localeConstants";

export const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const notoSansArabic = Noto_Sans_Arabic({
    subsets: ["arabic"],
    display: "swap",
    variable: "--font-noto-arabic",
});

export const notoSansHebrew = Noto_Sans_Hebrew({
    subsets: ["hebrew"],
    display: "swap",
    variable: "--font-noto-hebrew",
});

export const notoSansSC = Noto_Sans_SC({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-sc",
});

export const notoSansTC = Noto_Sans_TC({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-tc",
});

export const notoSansJP = Noto_Sans_JP({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-jp",
});

export function getFontForLocale(locale: string) {
    switch (locale) {
        case "ar":
            return notoSansArabic;
        case "he":
            return notoSansHebrew;
        case "zh-CN":
            return notoSansSC;
        case "zh-TW":
            return notoSansTC;
        case "ja":
            return notoSansJP;
        default:
            return inter;
    }
}

export function getFontClassName(locale: string): string {
    const font = getFontForLocale(locale);
    return font.className;
}
