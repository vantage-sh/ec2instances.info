import symbols from "./currency_symbols.json";

type ForexData = {
    [currency: string]: {
        code: string;
        name: string;
        rate: number;
    };
};

export type CurrencyItem = {
    code: string;
    name: string;
    usdRate: number;
    cnyRate: number;
    currencySymbol: string;
};

export default (async () => {
    // Get USD rates
    const forexUsdRes = await fetch(
        "https://www.floatrates.com/daily/usd.json",
    );
    if (!forexUsdRes.ok) {
        throw new Error("Failed to fetch forex USD rates");
    }
    let forexUsdData = (await forexUsdRes.json()) as ForexData;

    // Get CNY rates
    const forexCnyRes = await fetch(
        "https://www.floatrates.com/daily/cny.json",
    );
    if (!forexCnyRes.ok) {
        throw new Error("Failed to fetch forex CNY rates");
    }
    let forexCnyData = (await forexCnyRes.json()) as ForexData;

    // Get the intersection and handel
    const intersectingKeys = new Set(Object.keys(forexUsdData)).intersection(
        new Set(Object.keys(forexCnyData)),
    );
    const newData: CurrencyItem[] = Array.from(intersectingKeys).map((key) => ({
        code: forexUsdData[key].code,
        name: forexUsdData[key].name,
        usdRate: forexUsdData[key].rate,
        cnyRate: forexCnyData[key].rate,
        currencySymbol:
            symbols[forexUsdData[key].code as keyof typeof symbols] || "",
    }));

    // Handle edgecases (CNY and USD)
    newData.push({
        code: "CNY",
        name: "Chinese Yuan",
        usdRate: forexUsdData.cny.rate,
        cnyRate: 1,
        currencySymbol: "¥",
    });
    newData.push({
        code: "USD",
        name: "United States Dollar",
        usdRate: 1,
        cnyRate: forexCnyData.usd.rate,
        currencySymbol: "$",
    });
    newData.sort((a, b) => a.name.trim().localeCompare(b.name.trim()));

    // Return the data
    return newData;
})();
