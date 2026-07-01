export type SupportedLocale =
    | "en-US"
    | "en-GB"
    | "zh-CN"
    | "hi"
    | "es"
    | "fr"
    | "ar"
    | "bn"
    | "pt"
    | "ru"
    | "ur"
    | "id"
    | "de"
    | "ja"
    | "pcm"
    | "mr"
    | "te"
    | "tr"
    | "ta"
    | "yue"
    | "vi"
    | "wuu"
    | "tl"
    | "ko"
    | "fa"
    | "ha"
    | "arz"
    | "sw"
    | "jv"
    | "it"
    | "pnb"
    | "kn"
    | "gu"
    | "th"
    | "am"
    | "bho"
    | "pa"
    | "nan"
    | "cjy"
    | "yo"
    | "hak"
    | "my"
    | "su"
    | "om"
    | "uz"
    | "ms"
    | "hsn"
    | "pl"
    | "uk"
    | "ps"
    | "ml"
    | "sd"
    | "or"
    | "mai"
    | "ff"
    | "ig"
    | "ne"
    | "ceb"
    | "skr"
    | "zu"
    | "ro"
    | "nl"
    | "az"
    | "as"
    | "zh-TW"
    | "so"
    | "ku"
    | "si"
    | "kk"
    | "km"
    | "sn"
    | "rw"
    | "ny"
    | "hu"
    | "el"
    | "cs"
    | "mg"
    | "sv"
    | "awa"
    | "mad"
    | "hil"
    | "ilo"
    | "hne"
    | "mwr"
    | "ckb"
    | "he"
    | "rn"
    | "ak"
    | "bg"
    | "sr"
    | "ca"
    | "xh"
    | "be"
    | "da"
    | "fi"
    | "sk"
    | "nb"
    | "hr"
    | "ug"
    | "tt"
    | "mn"
    | "hy"
    | "ka"
    | "sq"
    | "lo"
    | "tg"
    | "ky"
    | "tk"
    | "bal"
    | "ti"
    | "wo"
    | "ln"
    | "sat"
    | "ks"
    | "mni"
    | "lg"
    | "bm"
    | "ee"
    | "tw"
    | "ts"
    | "tn"
    | "st"
    | "nso"
    | "af"
    | "ban"
    | "min"
    | "bug"
    | "ace"
    | "pam"
    | "war"
    | "bik"
    | "ary"
    | "arq"
    | "apc"
    | "acm"
    | "ars"
    | "afb"
    | "apd"
    | "dv"
    | "prs"
    | "bo"
    | "dz"
    | "shn"
    | "rhg"
    | "syl"
    | "mag"
    | "bgc"
    | "doi"
    | "kok"
    | "tcy"
    | "gon"
    | "brx"
    | "lus"
    | "kha"
    | "hmn"
    | "za"
    | "ii"
    | "ce"
    | "ba"
    | "cv"
    | "sah"
    | "os"
    | "av"
    | "kbd"
    | "lez"
    | "udm"
    | "kr"
    | "kg"
    | "lua"
    | "umb"
    | "kmb"
    | "vmw"
    | "bem"
    | "luo"
    | "ki"
    | "kam"
    | "suk"
    | "mos"
    | "dyu"
    | "sg"
    | "ss"
    | "nd"
    | "ve"
    | "nr"
    | "kab"
    | "shi"
    | "rif"
    | "zgh"
    | "lt"
    | "lv"
    | "et"
    | "sl"
    | "mk"
    | "is"
    | "ga"
    | "cy"
    | "eu"
    | "gl"
    | "lb"
    | "mt";

const SUPPORTED_LOCALES_ALL: SupportedLocale[] = [
    "en-US",
    "en-GB",
    "zh-CN",
    "hi",
    "es",
    "fr",
    "ar",
    "bn",
    "pt",
    "ru",
    "ur",
    "id",
    "de",
    "ja",
    "pcm",
    "mr",
    "te",
    "tr",
    "ta",
    "yue",
    "vi",
    "wuu",
    "tl",
    "ko",
    "fa",
    "ha",
    "arz",
    "sw",
    "jv",
    "it",
    "pnb",
    "kn",
    "gu",
    "th",
    "am",
    "bho",
    "pa",
    "nan",
    "cjy",
    "yo",
    "hak",
    "my",
    "su",
    "om",
    "uz",
    "ms",
    "hsn",
    "pl",
    "uk",
    "ps",
    "ml",
    "sd",
    "or",
    "mai",
    "ff",
    "ig",
    "ne",
    "ceb",
    "skr",
    "zu",
    "ro",
    "nl",
    "az",
    "as",
    "zh-TW",
    "so",
    "ku",
    "si",
    "kk",
    "km",
    "sn",
    "rw",
    "ny",
    "hu",
    "el",
    "cs",
    "mg",
    "sv",
    "awa",
    "mad",
    "hil",
    "ilo",
    "hne",
    "mwr",
    "ckb",
    "he",
    "rn",
    "ak",
    "bg",
    "sr",
    "ca",
    "xh",
    "be",
    "da",
    "fi",
    "sk",
    "nb",
    "hr",
    "ug",
    "tt",
    "mn",
    "hy",
    "ka",
    "sq",
    "lo",
    "tg",
    "ky",
    "tk",
    "bal",
    "ti",
    "wo",
    "ln",
    "sat",
    "ks",
    "mni",
    "lg",
    "bm",
    "ee",
    "tw",
    "ts",
    "tn",
    "st",
    "nso",
    "af",
    "ban",
    "min",
    "bug",
    "ace",
    "pam",
    "war",
    "bik",
    "ary",
    "arq",
    "apc",
    "acm",
    "ars",
    "afb",
    "apd",
    "dv",
    "prs",
    "bo",
    "dz",
    "shn",
    "rhg",
    "syl",
    "mag",
    "bgc",
    "doi",
    "kok",
    "tcy",
    "gon",
    "brx",
    "lus",
    "kha",
    "hmn",
    "za",
    "ii",
    "ce",
    "ba",
    "cv",
    "sah",
    "os",
    "av",
    "kbd",
    "lez",
    "udm",
    "kr",
    "kg",
    "lua",
    "umb",
    "kmb",
    "vmw",
    "bem",
    "luo",
    "ki",
    "kam",
    "suk",
    "mos",
    "dyu",
    "sg",
    "ss",
    "nd",
    "ve",
    "nr",
    "kab",
    "shi",
    "rif",
    "zgh",
    "lt",
    "lv",
    "et",
    "sl",
    "mk",
    "is",
    "ga",
    "cy",
    "eu",
    "gl",
    "lb",
    "mt",
];

export const SUPPORTED_LOCALES = SUPPORTED_LOCALES_ALL;

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
    ["en-US"]: "English",
    ["en-GB"]: "English",
    ["zh-CN"]: "中文（简体）",
    ["hi"]: "हिन्दी",
    ["es"]: "Español",
    ["fr"]: "Français",
    ["ar"]: "العربية",
    ["bn"]: "বাংলা",
    ["pt"]: "Português",
    ["ru"]: "Русский",
    ["ur"]: "اردو",
    ["id"]: "Bahasa Indonesia",
    ["de"]: "Deutsch",
    ["ja"]: "日本語",
    ["pcm"]: "Naijá",
    ["mr"]: "मराठी",
    ["te"]: "తెలుగు",
    ["tr"]: "Türkçe",
    ["ta"]: "தமிழ்",
    ["yue"]: "粵語",
    ["vi"]: "Tiếng Việt",
    ["wuu"]: "吳語",
    ["tl"]: "Tagalog",
    ["ko"]: "한국어",
    ["fa"]: "فارسی",
    ["ha"]: "Harshen Hausa",
    ["arz"]: "مصرى",
    ["sw"]: "Kiswahili",
    ["jv"]: "Basa Jawa",
    ["it"]: "Italiano",
    ["pnb"]: "پنجابی",
    ["kn"]: "ಕನ್ನಡ",
    ["gu"]: "ગુજરાતી",
    ["th"]: "ภาษาไทย",
    ["am"]: "አማርኛ",
    ["bho"]: "भोजपुरी",
    ["pa"]: "ਪੰਜਾਬੀ",
    ["nan"]: "閩南語",
    ["cjy"]: "晉語",
    ["yo"]: "Yorùbá",
    ["hak"]: "客家話",
    ["my"]: "မြန်မာဘာသာ",
    ["su"]: "Basa Sunda",
    ["om"]: "Afaan Oromoo",
    ["uz"]: "Oʻzbekcha",
    ["ms"]: "Bahasa Melayu",
    ["hsn"]: "湘語",
    ["pl"]: "Polski",
    ["uk"]: "Українська",
    ["ps"]: "پښتو",
    ["ml"]: "മലയാളം",
    ["sd"]: "سنڌي",
    ["or"]: "ଓଡ଼ିଆ",
    ["mai"]: "मैथिली",
    ["ff"]: "Fulfulde",
    ["ig"]: "Asụsụ Igbo",
    ["ne"]: "नेपाली",
    ["ceb"]: "Cebuano",
    ["skr"]: "سرائیکی",
    ["zu"]: "isiZulu",
    ["ro"]: "Română",
    ["nl"]: "Nederlands",
    ["az"]: "Azərbaycan dili",
    ["as"]: "অসমীয়া",
    ["zh-TW"]: "中文（繁體）",
    ["so"]: "Soomaaliga",
    ["ku"]: "Kurdî",
    ["si"]: "සිංහල",
    ["kk"]: "Қазақ тілі",
    ["km"]: "ភាសាខ្មែរ",
    ["sn"]: "chiShona",
    ["rw"]: "Ikinyarwanda",
    ["ny"]: "Chichewa",
    ["hu"]: "Magyar",
    ["el"]: "Ελληνικά",
    ["cs"]: "Čeština",
    ["mg"]: "Malagasy",
    ["sv"]: "Svenska",
    ["awa"]: "अवधी",
    ["mad"]: "Basa Madhura",
    ["hil"]: "Hiligaynon",
    ["ilo"]: "Ilokano",
    ["hne"]: "छत्तीसगढ़ी",
    ["mwr"]: "मारवाड़ी",
    ["ckb"]: "سۆرانی",
    ["he"]: "עברית",
    ["rn"]: "Ikirundi",
    ["ak"]: "Akan",
    ["bg"]: "Български",
    ["sr"]: "Српски",
    ["ca"]: "Català",
    ["xh"]: "isiXhosa",
    ["be"]: "Беларуская",
    ["da"]: "Dansk",
    ["fi"]: "Suomi",
    ["sk"]: "Slovenčina",
    ["nb"]: "Norsk",
    ["hr"]: "Hrvatski",
    ["ug"]: "ئۇيغۇرچە",
    ["tt"]: "Татарча",
    ["mn"]: "Монгол",
    ["hy"]: "Հայերեն",
    ["ka"]: "ქართული",
    ["sq"]: "Shqip",
    ["lo"]: "ພາສາລາວ",
    ["tg"]: "Тоҷикӣ",
    ["ky"]: "Кыргызча",
    ["tk"]: "Türkmençe",
    ["bal"]: "بلۏچی",
    ["ti"]: "ትግርኛ",
    ["wo"]: "Wolof",
    ["ln"]: "Lingála",
    ["sat"]: "ᱥᱟᱱᱛᱟᱲᱤ",
    ["ks"]: "کٲشُر",
    ["mni"]: "ꯃꯩꯇꯩꯂꯣꯟ",
    ["lg"]: "Luganda",
    ["bm"]: "Bamanankan",
    ["ee"]: "Eʋegbe",
    ["tw"]: "Twi",
    ["ts"]: "Xitsonga",
    ["tn"]: "Setswana",
    ["st"]: "Sesotho",
    ["nso"]: "Sepedi",
    ["af"]: "Afrikaans",
    ["ban"]: "Basa Bali",
    ["min"]: "Baso Minangkabau",
    ["bug"]: "Basa Ugi",
    ["ace"]: "Bahsa Acèh",
    ["pam"]: "Kapampangan",
    ["war"]: "Waray",
    ["bik"]: "Bikol",
    ["ary"]: "الدارجة",
    ["arq"]: "الجزائرية",
    ["apc"]: "شامي",
    ["acm"]: "عراقي",
    ["ars"]: "نجدي",
    ["afb"]: "خليجي",
    ["apd"]: "سوداني",
    ["dv"]: "ދިވެހި",
    ["prs"]: "دری",
    ["bo"]: "བོད་སྐད་",
    ["dz"]: "རྫོང་ཁ",
    ["shn"]: "လိၵ်ႈတႆး",
    ["rhg"]: "Ruáinga",
    ["syl"]: "ꠍꠤꠟꠐꠤ",
    ["mag"]: "मगही",
    ["bgc"]: "हरियाणवी",
    ["doi"]: "डोगरी",
    ["kok"]: "कोंकणी",
    ["tcy"]: "ತುಳು",
    ["gon"]: "గోండి",
    ["brx"]: "बड़ो",
    ["lus"]: "Mizo ṭawng",
    ["kha"]: "Ka Ktien Khasi",
    ["hmn"]: "Hmoob",
    ["za"]: "Vahcuengh",
    ["ii"]: "ꆈꌠꉙ",
    ["ce"]: "Нохчийн",
    ["ba"]: "Башҡортса",
    ["cv"]: "Чӑвашла",
    ["sah"]: "Саха тыла",
    ["os"]: "Ирон",
    ["av"]: "Авар",
    ["kbd"]: "Адыгэбзэ",
    ["lez"]: "Лезги",
    ["udm"]: "Удмурт",
    ["kr"]: "Kanuri",
    ["kg"]: "Kikongo",
    ["lua"]: "Tshiluba",
    ["umb"]: "Umbundu",
    ["kmb"]: "Kimbundu",
    ["vmw"]: "Emakhuwa",
    ["bem"]: "Ichibemba",
    ["luo"]: "Dholuo",
    ["ki"]: "Gĩkũyũ",
    ["kam"]: "Kikamba",
    ["suk"]: "Kisukuma",
    ["mos"]: "Mòoré",
    ["dyu"]: "Julakan",
    ["sg"]: "Sängö",
    ["ss"]: "siSwati",
    ["nd"]: "isiNdebele",
    ["ve"]: "Tshivenḓa",
    ["nr"]: "isiNdebele",
    ["kab"]: "Taqbaylit",
    ["shi"]: "Taclḥit",
    ["rif"]: "Tarifit",
    ["zgh"]: "ⵜⴰⵎⴰⵣⵉⵖⵜ",
    ["lt"]: "Lietuvių",
    ["lv"]: "Latviešu",
    ["et"]: "Eesti",
    ["sl"]: "Slovenščina",
    ["mk"]: "Македонски",
    ["is"]: "Íslenska",
    ["ga"]: "Gaeilge",
    ["cy"]: "Cymraeg",
    ["eu"]: "Euskara",
    ["gl"]: "Galego",
    ["lb"]: "Lëtzebuergesch",
    ["mt"]: "Malti",
};

export const DEFAULT_LOCALE: SupportedLocale = "en-GB";

// Locales whose instance detail pages are prerendered at build time. Only the
// default locale is prebuilt; the remaining ~199 locales are rendered on demand
// at runtime (ISR via `dynamicParams`). Prerendering more locales multiplies
// Next 16's per-page segment-cache output (locales x ~3000 detail pages) to a
// scale where the standalone/OpenNext output copy becomes inconsistent, so the
// build only prebuilds this single locale.
export const PRERENDER_LOCALES: SupportedLocale[] = [];

export const RTL_LOCALES: SupportedLocale[] = ["ar", "ur", "fa", "arz", "pnb", "ps", "sd", "skr", "ckb", "he", "ug", "bal", "ks", "ary", "arq", "apc", "acm", "ars", "afb", "apd", "dv", "prs"];

export function isRTL(locale: string): boolean {
    return RTL_LOCALES.includes(locale as SupportedLocale);
}
