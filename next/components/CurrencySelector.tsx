"use client";

import type { CurrencyItem } from "@/utils/loadCurrencies";
import FilterDropdown from "./FilterDropdown";
import { currencyRateAtom } from "@/state";
import { browserBlockingLocalStorage } from "@/utils/abGroup";
import { useTranslations } from "gt-next";

type CurrencySelectorProps = {
    currencies: CurrencyItem[];
    currency: string;
    setCurrency: (currency: string) => void;
    setPathSuffix: (pathSuffix: string) => void;
    controls: string;
};

export default function CurrencySelector({
    currencies,
    currency,
    setCurrency,
    setPathSuffix,
    controls,
}: CurrencySelectorProps) {
    const t = useTranslations();
    return (
        <FilterDropdown
            label={t("filters.currency")}
            value={currency}
            ariaControls={controls}
            onChange={(v) => {
                setCurrency(v);
                const url = new URL(window.location.href);
                url.searchParams.set("currency", v);
                if (!browserBlockingLocalStorage) {
                    localStorage.setItem("last_currency", v);
                }
                window.history.replaceState({}, "", url.toString());
                setPathSuffix("?" + url.searchParams.toString());
                const rates = currencies.find((c) => c.code === v)!;
                currencyRateAtom.set({
                    usd: rates.usdRate,
                    cny: rates.cnyRate,
                });
            }}
            options={currencies.map((c) => ({
                value: c.code,
                label: `${c.name}${c.currencySymbol && ` (${c.currencySymbol})`}`,
            }))}
            hideSearch={false}
            small={true}
            hideLabel={true}
        />
    );
}
