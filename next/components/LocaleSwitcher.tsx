"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    SUPPORTED_LOCALES,
    LOCALE_NAMES,
    DEFAULT_LOCALE,
    type SupportedLocale,
} from "@/utils/localeConstants";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useTranslations } from "gt-next";

type LocaleSwitcherProps = {
    locale: string;
};

export default function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations();
    const [open, setOpen] = useState(false);

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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    aria-label={t("localeSwitcher.label")}
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLocaleName}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
                <Command>
                    <CommandInput placeholder="Search language..." />
                    <CommandList>
                        <CommandEmpty>No language found.</CommandEmpty>
                        {SUPPORTED_LOCALES.map((loc) => (
                            <CommandItem
                                key={loc}
                                value={`${LOCALE_NAMES[loc]} ${loc}`}
                                onSelect={() => {
                                    setOpen(false);
                                    router.push(getNewPath(loc));
                                }}
                                className={
                                    loc === locale ? "bg-accent" : undefined
                                }
                            >
                                {LOCALE_NAMES[loc]}
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
