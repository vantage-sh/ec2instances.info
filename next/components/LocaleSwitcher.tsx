"use client";

import { usePathname } from "next/navigation";
import {
    SUPPORTED_LOCALES,
    LOCALE_NAMES,
    DEFAULT_LOCALE,
    type SupportedLocale,
} from "@/utils/localeConstants";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useTranslations } from "gt-next";

type LocaleSwitcherProps = {
    locale: string;
};

export default function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
    const pathname = usePathname();
    const t = useTranslations();

    const getNewPath = (newLocale: SupportedLocale) => {
        // Remove the current locale from the path
        const pathWithoutLocale = pathname.replace(
            new RegExp(`^/${locale}(?=/|$)`),
            "",
        );
        // Add the new locale
        if (newLocale === DEFAULT_LOCALE) {
            return `/${newLocale}${pathWithoutLocale || "/"}`;
        }
        return `/${newLocale}${pathWithoutLocale || ""}`;
    };

    const currentLocaleName =
        LOCALE_NAMES[locale as SupportedLocale] || locale;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    aria-label={t("localeSwitcher.label")}
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLocaleName}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {SUPPORTED_LOCALES.map((loc) => (
                    <DropdownMenuItem
                        key={loc}
                        asChild
                        className={loc === locale ? "bg-accent" : ""}
                    >
                        <a href={getNewPath(loc)}>{LOCALE_NAMES[loc]}</a>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
