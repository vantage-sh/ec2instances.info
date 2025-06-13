"use client";

import { CostDuration, Region } from "@/types";
import { DollarSignIcon } from "lucide-react";
import { useMemo, useState, useId, useEffect, useCallback } from "react";
import processRainbowTable from "@/utils/processRainbowTable";
import { durationOptions } from "@/utils/dataMappings";

interface Platform {
    ondemand: string | number;
    reserved?: {
        [term: string]: string | number;
    };
    spot_avg?: string | number;
    spot_min?: string | number;
}

function dollarString(
    value: string | number | undefined,
    duration: CostDuration,
) {
    if (value === undefined || value === "0") return "N/A";
    const n = Number(value);
    if (isNaN(n)) return "N/A";

    const hourMultipliers = {
        secondly: 1 / (60 * 60),
        minutely: 1 / 60,
        hourly: 1,
        daily: 24,
        weekly: 7 * 24,
        monthly: (365 * 24) / 12,
        annually: 365 * 24,
    };

    const mul = n * hourMultipliers[duration];
    const rounded = Math.round(mul * 10000) / 10000;
    return `$${rounded}`;
}

function keysWithOnDemand(regionPricing: Record<string, Platform>) {
    return Object.keys(regionPricing).filter(
        (platform) =>
            regionPricing[platform].ondemand &&
            !BAD_ON_DEMAND.includes(regionPricing[platform].ondemand),
    );
}

// https://www.youtube.com/watch?v=rksaoaqt3JA
const BAD_ON_DEMAND: (string | number | undefined)[] = [0, "0", "", undefined];

function Calculator({
    pricing,
    regions,
    osOptions,
    defaultOs,
    storeOsNameRatherThanId,
    reservedTermOptions,
    removeSpot,
    defaultRegionForType,
    useSpotMin,
    setPathSuffix,
}: {
    pricing: Record<string, Record<string, Platform>>;
    regions: Region;
    osOptions: [string, string][];
    defaultOs: string;
    storeOsNameRatherThanId: boolean;
    reservedTermOptions: [string, string][];
    removeSpot: boolean;
    defaultRegionForType: string;
    useSpotMin: boolean;
    setPathSuffix: (value: string) => void;
}) {
    const priceHoldersId = useId();

    const defaultRegion = useMemo(() => {
        if (!pricing[defaultRegionForType]) return Object.keys(pricing)[0];
        return defaultRegionForType;
    }, [pricing, defaultRegionForType]);

    const defaultPlatform = useMemo(() => {
        return !BAD_ON_DEMAND.includes(
            pricing[defaultRegion]?.[defaultOs]?.ondemand,
        )
            ? defaultOs
            : keysWithOnDemand(pricing[defaultRegion] || {})[0] || defaultOs;
    }, [pricing, defaultOs, defaultRegion]);

    const [region, setRegionState] = useState<string>(defaultRegion);
    const [platform, setPlatformState] = useState<string>(defaultPlatform);
    const [duration, setDurationState] = useState<CostDuration>("hourly");
    const [pricingType, setPricingTypeState] =
        useState<string>("Standard.noUpfront");

    // Check the URL to make sure this is the state it was originally in.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const query = new URLSearchParams(window.location.search);

        const region = query.get("region");
        if (region && (regions.local_zone[region] || regions.main[region]))
            setRegionState(region);

        // If there is no OS option, don't let the user change it.
        if (defaultPlatform === defaultOs) {
            const platform = query.get("platform");
            if (platform) {
                if (storeOsNameRatherThanId) {
                    const osByName = osOptions.find(
                        ([, name]) => name === platform,
                    );
                    if (osByName) setPlatformState(osByName[0]);
                } else {
                    const osById = osOptions.find(([id]) => id === platform);
                    if (osById) setPlatformState(platform);
                }
            }
        }

        const duration = query.get("duration");
        switch (duration) {
            case "secondly":
            case "minutely":
            case "hourly":
            case "daily":
            case "weekly":
            case "monthly":
            case "annually":
                setDurationState(duration as CostDuration);
                break;
        }

        const pricingType = query.get("pricingType");
        if (pricingType) {
            // We do this in case the case got weird when reading the link.
            const validPricingType = reservedTermOptions.find(
                ([value]) => value.toLowerCase() === pricingType.toLowerCase(),
            );
            if (validPricingType) setPricingTypeState(validPricingType[0]);
        }
    }, [pricing, regions, osOptions, storeOsNameRatherThanId, defaultOs]);

    function wrapStringUpdater<T extends string>(
        handler: (value: T) => void,
        key: string,
    ) {
        return (value: T) => {
            handler(value);
            if (typeof window === "undefined") return;
            const url = new URL(window.location.href);
            url.searchParams.set(key, value);
            window.history.replaceState({}, "", url.toString());
            setPathSuffix?.("?" + url.searchParams.toString());
        };
    }
    const setRegion = wrapStringUpdater(setRegionState, "region");
    const setDuration = wrapStringUpdater<CostDuration>(
        setDurationState,
        "duration",
    );
    const setPricingType = wrapStringUpdater(
        setPricingTypeState,
        "pricingType",
    );
    const setPlatform = useCallback(
        (value: string) => {
            setPlatformState(value);
            let v = value;
            if (storeOsNameRatherThanId) {
                v = osOptions.find(([id]) => id === value)?.[1] || value;
            }
            const url = new URL(window.location.href);
            url.searchParams.set("platform", v);
            window.history.replaceState({}, "", url.toString());
            setPathSuffix?.("?" + url.searchParams.toString());
        },
        [setPlatformState, storeOsNameRatherThanId, osOptions],
    );

    const prices = useMemo(() => {
        const root = pricing[region]?.[platform];
        const a = [
            {
                label: "On Demand",
                value: dollarString(root?.ondemand, duration),
            },
        ];
        if (!removeSpot) {
            a.push({
                label: "Spot",
                value: dollarString(
                    useSpotMin ? root?.spot_min : root?.spot_avg,
                    duration,
                ),
            });
        }
        a.push(
            {
                label: "1-Year Reserved",
                value: dollarString(
                    root?.reserved?.[`yrTerm1${pricingType}`],
                    duration,
                ),
            },
            {
                label: "3-Year Reserved",
                value: dollarString(
                    root?.reserved?.[`yrTerm3${pricingType}`],
                    duration,
                ),
            },
        );
        return a;
    }, [pricing, region, platform, duration, pricingType, removeSpot]);

    const handleRegions = (regionsArr: [string, string][], label: string) => {
        const v = regionsArr
            .sort((a, b) => {
                return a[1].localeCompare(b[1]);
            })
            .map(([code, name]) => (
                <option key={code} value={code} disabled={!pricing[code]}>
                    {name}
                </option>
            ));
        return <optgroup label={label}>{v}</optgroup>;
    };

    const mainRegions = useMemo(
        () => handleRegions(Object.entries(regions.main), "Main Regions"),
        [regions.main, pricing],
    );

    const localZones = useMemo(
        () => handleRegions(Object.entries(regions.local_zone), "Local Zones"),
        [regions.local_zone, pricing],
    );

    const wavelengthRegions = useMemo(
        () => handleRegions(Object.entries(regions.wavelength), "Wavelength"),
        [regions.wavelength, pricing],
    );

    const selectStyling = "w-full border border-gray-200 rounded-md p-1";

    return (
        <>
            <div
                className="mt-2"
                id={priceHoldersId}
                aria-live="polite"
                aria-atomic="true"
            >
                <div className="flex gap-4 w-full flex-wrap">
                    {prices.map(({ label, value }) => (
                        <div key={label} className="flex-col">
                            <p className="font-bold">{value}</p>
                            <p className="text-xs text-gray-3">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <select
                    aria-label="Region"
                    aria-controls={priceHoldersId}
                    value={region}
                    className={selectStyling}
                    onChange={(e) => setRegion(e.target.value)}
                >
                    {mainRegions}
                    {localZones}
                    {wavelengthRegions}
                </select>

                {defaultPlatform === defaultOs && (
                    <select
                        aria-label="Platform"
                        aria-controls={priceHoldersId}
                        value={platform}
                        className={selectStyling}
                        onChange={(e) => setPlatform(e.target.value)}
                    >
                        {osOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                )}

                <select
                    aria-label="Duration"
                    aria-controls={priceHoldersId}
                    value={duration}
                    className={selectStyling}
                    onChange={(e) =>
                        setDuration(e.target.value as CostDuration)
                    }
                >
                    {durationOptions.map(({ value, label }) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>

                <select
                    aria-label="Pricing Type"
                    aria-controls={priceHoldersId}
                    value={pricingType}
                    className={selectStyling}
                    onChange={(e) => setPricingType(e.target.value)}
                >
                    {reservedTermOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>
        </>
    );
}

type PricingCalculatorProps = {
    rainbowTable: string[];
    compressedInstance: { pricing: Record<string, Record<string, Platform>> };
    regions: Region;
    osOptions: [string, string][];
    defaultOs: string;
    storeOsNameRatherThanId: boolean;
    reservedTermOptions: [string, string][];
    removeSpot: boolean;
    defaultRegion: string;
    useSpotMin: boolean;
    setPathSuffix: (value: string) => void;
};

export default function PricingCalculator({
    rainbowTable,
    compressedInstance,
    regions,
    osOptions,
    defaultOs,
    storeOsNameRatherThanId,
    reservedTermOptions,
    removeSpot,
    defaultRegion,
    useSpotMin,
    setPathSuffix,
}: PricingCalculatorProps) {
    const instance = useMemo(() => {
        if (!Array.isArray(compressedInstance.pricing))
            return compressedInstance;
        return processRainbowTable(rainbowTable, compressedInstance);
    }, [rainbowTable, compressedInstance]);

    return (
        <section className="mb-4">
            <h3 className="flex items-center gap-2">
                <DollarSignIcon className="w-4 h-4 inline-block my-auto" />{" "}
                Pricing
            </h3>
            <Calculator
                pricing={instance.pricing}
                regions={regions}
                osOptions={osOptions}
                defaultOs={defaultOs}
                storeOsNameRatherThanId={storeOsNameRatherThanId}
                reservedTermOptions={reservedTermOptions}
                removeSpot={removeSpot}
                defaultRegionForType={defaultRegion}
                useSpotMin={useSpotMin}
                setPathSuffix={setPathSuffix}
            />
        </section>
    );
}
