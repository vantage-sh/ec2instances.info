"use client";

import { useTranslations } from "gt-next";

// useTranslations() accesses the active-locale dictionary loaded by GTProvider
// (via loadTranslations.ts), which places columns.json under the "columns" key.
// Callers pass keys like "columns.common.name" which resolve to
// dict.columns.common.name — covering all 200 locales with no extra bundle weight.
// The default locale (en-GB, per gt.config.json) is used as the fallback for
// any missing keys.
export function useColumnTranslations(): (key: string) => string {
    const t = useTranslations();
    return (key: string): string => t(key);
}
