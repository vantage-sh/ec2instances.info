import {
    Noto_Sans,
    Noto_Sans_Arabic,
    Noto_Sans_Armenian,
    Noto_Sans_Bengali,
    Noto_Sans_Devanagari,
    Noto_Sans_Ethiopic,
    Noto_Sans_Georgian,
    Noto_Sans_Gujarati,
    Noto_Sans_Gurmukhi,
    Noto_Sans_Hanifi_Rohingya,
    Noto_Sans_Hebrew,
    Noto_Sans_JP,
    Noto_Sans_KR,
    Noto_Sans_Kannada,
    Noto_Sans_Khmer,
    Noto_Sans_Lao,
    Noto_Sans_Malayalam,
    Noto_Sans_Meetei_Mayek,
    Noto_Sans_Myanmar,
    Noto_Sans_Ol_Chiki,
    Noto_Sans_Oriya,
    Noto_Sans_SC,
    Noto_Sans_Sinhala,
    Noto_Sans_Syloti_Nagri,
    Noto_Sans_TC,
    Noto_Sans_Tamil,
    Noto_Sans_Telugu,
    Noto_Sans_Thaana,
    Noto_Sans_Thai,
    Noto_Sans_Tifinagh,
    Noto_Sans_Yi,
    Noto_Serif_Tibetan,
} from "next/font/google";

// Re-export locale constants for backward compatibility
export {
    type SupportedLocale,
    SUPPORTED_LOCALES,
    PRERENDER_LOCALES,
    LOCALE_NAMES,
    DEFAULT_LOCALE,
    RTL_LOCALES,
    isRTL,
} from "./localeConstants";

// Font selection per locale script.
//
// Each locale is mapped to a "Noto Sans <Script>" family that can render its
// writing system. Latin / Cyrillic / Greek / Vietnamese locales use the base
// "Noto Sans" family. Its subsets cover latin, latin-ext, cyrillic,
// cyrillic-ext, greek, and vietnamese (all confirmed present in the
// @next/font font-data.json manifest). Tibetan (bo, dz) has no Noto Sans
// family, so it uses Noto Serif Tibetan; base Noto Sans is the final fallback
// for any locale not explicitly mapped.
//
// next/font/google requires literal call arguments, so every font is
// initialised explicitly at module scope below. Only (family, subset, weight)
// combinations present in @next/font's font-data.json manifest are used.

export const notoSans = Noto_Sans({
    subsets: [
        "latin",
        "latin-ext",
        "cyrillic",
        "cyrillic-ext",
        "greek",
        "vietnamese",
    ],
    display: "swap",
    variable: "--font-noto-sans",
});

export const notoSansArabic = Noto_Sans_Arabic({
    subsets: ["arabic"],
    display: "swap",
    variable: "--font-noto-sans-arabic",
});

export const notoSansHebrew = Noto_Sans_Hebrew({
    subsets: ["hebrew"],
    display: "swap",
    variable: "--font-noto-sans-hebrew",
});

export const notoDevanagari = Noto_Sans_Devanagari({
    subsets: ["devanagari"],
    display: "swap",
    variable: "--font-noto-devanagari",
});

export const notoBengali = Noto_Sans_Bengali({
    subsets: ["bengali"],
    display: "swap",
    variable: "--font-noto-bengali",
});

export const notoTamil = Noto_Sans_Tamil({
    subsets: ["tamil"],
    display: "swap",
    variable: "--font-noto-tamil",
});

export const notoTelugu = Noto_Sans_Telugu({
    subsets: ["telugu"],
    display: "swap",
    variable: "--font-noto-telugu",
});

export const notoKannada = Noto_Sans_Kannada({
    subsets: ["kannada"],
    display: "swap",
    variable: "--font-noto-kannada",
});

export const notoMalayalam = Noto_Sans_Malayalam({
    subsets: ["malayalam"],
    display: "swap",
    variable: "--font-noto-malayalam",
});

export const notoGujarati = Noto_Sans_Gujarati({
    subsets: ["gujarati"],
    display: "swap",
    variable: "--font-noto-gujarati",
});

export const notoGurmukhi = Noto_Sans_Gurmukhi({
    subsets: ["gurmukhi"],
    display: "swap",
    variable: "--font-noto-gurmukhi",
});

export const notoOriya = Noto_Sans_Oriya({
    subsets: ["oriya"],
    display: "swap",
    variable: "--font-noto-oriya",
});

export const notoSinhala = Noto_Sans_Sinhala({
    subsets: ["sinhala"],
    display: "swap",
    variable: "--font-noto-sinhala",
});

export const notoThai = Noto_Sans_Thai({
    subsets: ["thai"],
    display: "swap",
    variable: "--font-noto-thai",
});

export const notoLao = Noto_Sans_Lao({
    subsets: ["lao"],
    display: "swap",
    variable: "--font-noto-lao",
});

export const notoKhmer = Noto_Sans_Khmer({
    subsets: ["khmer"],
    display: "swap",
    variable: "--font-noto-khmer",
});

export const notoMyanmar = Noto_Sans_Myanmar({
    subsets: ["myanmar"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-myanmar",
});

export const notoGeorgian = Noto_Sans_Georgian({
    subsets: ["georgian"],
    display: "swap",
    variable: "--font-noto-georgian",
});

export const notoArmenian = Noto_Sans_Armenian({
    subsets: ["armenian"],
    display: "swap",
    variable: "--font-noto-armenian",
});

export const notoEthiopic = Noto_Sans_Ethiopic({
    subsets: ["ethiopic"],
    display: "swap",
    variable: "--font-noto-ethiopic",
});

export const notoThaana = Noto_Sans_Thaana({
    subsets: ["thaana"],
    display: "swap",
    variable: "--font-noto-thaana",
});

export const notoSansSC = Noto_Sans_SC({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-sans-s-c",
});

export const notoSansTC = Noto_Sans_TC({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-sans-t-c",
});

export const notoSansJP = Noto_Sans_JP({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-sans-j-p",
});

export const notoSansKR = Noto_Sans_KR({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-sans-k-r",
});

export const notoOlChiki = Noto_Sans_Ol_Chiki({
    subsets: ["ol-chiki"],
    display: "swap",
    variable: "--font-noto-ol-chiki",
});

export const notoMeeteiMayek = Noto_Sans_Meetei_Mayek({
    subsets: ["meetei-mayek"],
    display: "swap",
    variable: "--font-noto-meetei-mayek",
});

export const notoSylotiNagri = Noto_Sans_Syloti_Nagri({
    subsets: ["syloti-nagri"],
    weight: ["400"],
    display: "swap",
    variable: "--font-noto-syloti-nagri",
});

export const notoYi = Noto_Sans_Yi({
    subsets: ["yi"],
    weight: ["400"],
    display: "swap",
    variable: "--font-noto-yi",
});

// Tibetan script (bo, dz): Google Fonts has no Noto Sans Tibetan, only the
// serif family, which still renders the glyphs correctly (better than tofu).
export const notoSerifTibetan = Noto_Serif_Tibetan({
    subsets: ["tibetan"],
    display: "swap",
    variable: "--font-noto-tibetan",
});

export const notoTifinagh = Noto_Sans_Tifinagh({
    subsets: ["tifinagh"],
    weight: ["400"],
    display: "swap",
    variable: "--font-noto-tifinagh",
});

// Rohingya script (rhg): Noto Sans Hanifi Rohingya is present in the
// @next/font font-data.json manifest with subset "hanifi-rohingya".
export const notoHanifiRohingya = Noto_Sans_Hanifi_Rohingya({
    subsets: ["hanifi-rohingya"],
    display: "swap",
    variable: "--font-noto-hanifi-rohingya",
});

export function getFontForLocale(locale: string) {
    switch (locale) {
        case "ar":
        case "ur":
        case "fa":
        case "arz":
        case "pnb":
        case "ps":
        case "sd":
        case "skr":
        case "ckb":
        case "ug":
        case "bal":
        case "ks":
        case "ary":
        case "arq":
        case "apc":
        case "acm":
        case "ars":
        case "afb":
        case "apd":
        case "prs":
            return notoSansArabic;
        case "he":
            return notoSansHebrew;
        case "hi":
        case "mr":
        case "bho":
        case "mai":
        case "ne":
        case "awa":
        case "hne":
        case "mwr":
        case "mag":
        case "bgc":
        case "doi":
        case "kok":
        case "brx":
            return notoDevanagari;
        case "bn":
        case "as":
            return notoBengali;
        case "ta":
            return notoTamil;
        case "te":
        case "gon":
            return notoTelugu;
        case "kn":
        case "tcy":
            return notoKannada;
        case "ml":
            return notoMalayalam;
        case "gu":
            return notoGujarati;
        case "pa":
            return notoGurmukhi;
        case "or":
            return notoOriya;
        case "si":
            return notoSinhala;
        case "th":
            return notoThai;
        case "lo":
            return notoLao;
        case "km":
            return notoKhmer;
        case "my":
        case "shn":
            return notoMyanmar;
        case "ka":
            return notoGeorgian;
        case "hy":
            return notoArmenian;
        case "am":
        case "ti":
            return notoEthiopic;
        case "dv":
            return notoThaana;
        case "zh-CN":
        case "wuu":
        case "nan":
        case "cjy":
        case "hak":
        case "hsn":
            return notoSansSC;
        case "yue":
        case "zh-TW":
            return notoSansTC;
        case "ja":
            return notoSansJP;
        case "ko":
            return notoSansKR;
        case "sat":
            return notoOlChiki;
        case "mni":
            return notoMeeteiMayek;
        case "syl":
            return notoSylotiNagri;
        case "ii":
            return notoYi;
        case "zgh":
            return notoTifinagh;
        case "rhg":
            return notoHanifiRohingya;
        case "bo":
        case "dz":
            return notoSerifTibetan;
        default:
            return notoSans;
    }
}

export function getFontClassName(locale: string): string {
    const font = getFontForLocale(locale);
    return font.className;
}
