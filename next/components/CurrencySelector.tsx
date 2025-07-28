import type { CurrencyItem } from "@/utils/loadCurrencies";
import FilterDropdown from "./FilterDropdown";

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
    return (
        <FilterDropdown
            label="Currency"
            value={currency}
            ariaControls={controls}
            onChange={(v) => {
                setCurrency(v);
                const url = new URL(window.location.href);
                url.searchParams.set("currency", v);
                localStorage.setItem("last_currency", v);
                window.history.replaceState({}, "", url.toString());
                setPathSuffix("?" + url.searchParams.toString());
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
