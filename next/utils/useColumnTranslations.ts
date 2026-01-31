"use client";

import { useLocale } from "gt-next";
import { useMemo } from "react";

// Import all column translations statically
import enGB from "@/translations/en-GB/columns.json";
import enUS from "@/translations/en-US/columns.json";
import de from "@/translations/de/columns.json";
import sv from "@/translations/sv/columns.json";
import zhCN from "@/translations/zh-CN/columns.json";
import zhTW from "@/translations/zh-TW/columns.json";
import ja from "@/translations/ja/columns.json";
import he from "@/translations/he/columns.json";
import ar from "@/translations/ar/columns.json";

const translations: Record<string, typeof enUS> = {
    "en-GB": enGB,
    "en-US": enUS,
    de,
    sv,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    ja,
    he,
    ar,
};

// Fallback to English
const fallback = enUS;

// Create a case-insensitive lookup map
const localeMap: Record<string, string> = {};
for (const key of Object.keys(translations)) {
    localeMap[key.toLowerCase()] = key;
}

function normalizeLocale(locale: string): string {
    // First try exact match
    if (translations[locale]) return locale;
    // Then try case-insensitive match
    const normalized = localeMap[locale.toLowerCase()];
    if (normalized) return normalized;
    // Return the locale as-is (will fall back to English)
    return locale;
}

function getNestedValue(obj: any, path: string): string | undefined {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return typeof current === "string" ? current : undefined;
}

export function useColumnTranslations(): (key: string) => string {
    const rawLocale = useLocale();
    const locale = normalizeLocale(rawLocale);

    return useMemo(() => {
        const dict = translations[locale] || fallback;

        return (key: string): string => {
            // Remove "columns." prefix since our JSON files don't have it
            const actualKey = key.replace(/^columns\./, "");
            const value = getNestedValue(dict, actualKey);
            if (value) return value;

            // Fallback to English
            const fallbackValue = getNestedValue(fallback, actualKey);
            if (fallbackValue) return fallbackValue;

            // Return the key if nothing found
            return key;
        };
    }, [locale]);
}
