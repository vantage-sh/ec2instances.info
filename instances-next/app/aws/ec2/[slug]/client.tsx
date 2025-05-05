"use client";

import { Instance, Pricing, CostDuration, Region } from "@/types";
import { DollarSignIcon, Server } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useId, useEffect } from "react";
import processRainbowTable from "@/utils/processRainbowTable";
import { durationOptions } from "@/utils/dataMappings";

export type AllOfInstanceType = {
    name: string;
    cpus: number;
    memory: string | number;
}[];

function dollarString(value: string | undefined, duration: CostDuration) {
    if (value === undefined) return "N/A";
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

const osOptions = [
    ["linux", "Linux"],
    ["mswin", "Windows"],
    ["rhel", "Red Hat"],
    ["sles", "SUSE"],
    ["dedicated", "Dedicated Host"],
    ["linuxSQL", "Linux SQL Server"],
    ["linuxSQLWeb", "Linux SQL Server for Web"],
    ["linuxSQLEnterprise", "Linux SQL Enterprise"],
    ["mswinSQL", "Windows SQL Server"],
    ["mswinSQLWeb", "Windows SQL Web"],
    ["mswinSQLEnterprise", "Windows SQL Enterprise"],
    ["rhelSQL", "Red Hat SQL Server"],
    ["rhelSQLWeb", "Red Hat SQL Web"],
    ["rhelSQLEnterprise", "Red Hat SQL Enterprise"],
] as const;

const reservedTermOptions = [
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
    ["Convertible.noUpfront", "No Upfront (Convertible)"],
    ["Convertible.partialUpfront", "Partial Upfront (Convertible)"],
    ["Convertible.allUpfront", "All Upfront (Convertible)"],
] as const;

function Calculator({ pricing, regions }: { pricing: Pricing; regions: Region }) {
    const priceHoldersId = useId();

    const defaultPlatform = useMemo(() => {
        return pricing["us-east-1"]?.["linux"] ?
            "linux" :
            Object.keys(pricing["us-east-1"] || {})[0] || "linux";
    }, [pricing]);

    const [region, setRegionState] = useState<string>("us-east-1");
    const [platform, setPlatformState] = useState<string>(defaultPlatform);
    const [duration, setDurationState] = useState<CostDuration>("hourly");
    const [pricingType, setPricingTypeState] = useState<string>("Standard.noUpfront");

    // Check the URL to make sure this is the state it was originally in.
    useEffect(() => {
        if (typeof window === "undefined") return;
        const query = new URLSearchParams(window.location.search);

        const region = query.get("region");
        if (region && regions.local_zone[region]) setRegionState(region);

        // If there is no OS option, don't let the user change it.
        if (defaultPlatform === "linux") {
            const platform = query.get("platform");
            if (platform && osOptions.some(([value]) => value === platform)) setPlatformState(platform);
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
            const validPricingType = reservedTermOptions.find(([value]) => value.toLowerCase() === pricingType.toLowerCase());
            if (validPricingType) setPricingTypeState(validPricingType[0]);
        }
    }, []);

    function wrapStringUpdater<T extends string>(handler: (value: T) => void, key: string) {
        return (value: T) => {
            handler(value);
            if (typeof window === "undefined") return;
            const url = new URL(window.location.href);
            url.searchParams.set(key, value);
            window.history.replaceState({}, "", url.toString());
        };
    }
    const setRegion = wrapStringUpdater(setRegionState, "region");
    const setPlatform = wrapStringUpdater(setPlatformState, "platform");
    const setDuration = wrapStringUpdater<CostDuration>(setDurationState, "duration");
    const setPricingType = wrapStringUpdater(setPricingTypeState, "pricingType");

    const prices = useMemo(() => {
        const root = pricing[region]?.[platform];
        return [
            {
                label: "On Demand",
                value: dollarString(root?.ondemand, duration),
            },
            {
                label: "Spot",
                value: dollarString(root?.spot_avg, duration),
            },
            {
                label: "1-Year Reserved",
                value: dollarString(root?.reserved?.[`yrTerm1${pricingType}`], duration),
            },
            {
                label: "3-Year Reserved",
                value: dollarString(root?.reserved?.[`yrTerm3${pricingType}`], duration),
            },
        ];
    }, [pricing, region, platform, duration, pricingType]);

    const localZones = useMemo(() => {
        return Object.entries(regions.local_zone).sort((a, b) => {
            // Generally alphabetical, but us-east-1 is first.
            if (a[0] === "us-east-1") return -1;
            if (b[0] === "us-east-1") return 1;
            return a[1].localeCompare(b[1]);
        });
    }, [regions]);

    const selectStyling = "w-full border border-gray-200 rounded-md p-1";

    return (
        <>
            <div className="mt-2" id={priceHoldersId} aria-live="polite" aria-atomic="true">
                <div className="flex gap-4 w-full flex-wrap">
                    {prices.map(({ label, value }) => (
                        <div key={label} className="flex-col">
                            <p className="text-lg font-bold text-center">{value}</p>
                            <p className="text-xs text-center">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <select aria-controls={priceHoldersId} value={region} className={selectStyling} onChange={(e) => setRegion(e.target.value)}>
                    {localZones.map(([code, name]) => (
                        <option key={code} value={code} disabled={!pricing[code]}>{name}</option>
                    ))}
                </select>

                {
                    defaultPlatform === "linux" && (
                        <select aria-controls={priceHoldersId} value={platform} className={selectStyling} onChange={(e) => setPlatform(e.target.value)}>
                            {osOptions.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    )
                }

                <select aria-controls={priceHoldersId} value={duration} className={selectStyling} onChange={(e) => setDuration(e.target.value as CostDuration)}>
                    {
                        durationOptions.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))
                    }
                </select>

                <select aria-controls={priceHoldersId} value={pricingType} className={selectStyling} onChange={(e) => setPricingType(e.target.value)}>
                    {reservedTermOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>
        </>
    );
}

type PricingSelectorProps = {
    rainbowTable: string[];
    compressedInstance: Instance;
    regions: Region;
}

export function PricingSelector({ rainbowTable, compressedInstance, regions }: PricingSelectorProps) {
    const instance = useMemo(() => {
        if (!Array.isArray(compressedInstance.pricing)) return compressedInstance;
        return processRainbowTable(rainbowTable, compressedInstance);
    }, [rainbowTable, compressedInstance]);

    return (
        <section className="mb-4">
            <h3 className="flex items-center gap-2"><DollarSignIcon className="w-4 h-4 inline-block my-auto" /> Pricing</h3>
            <Calculator pricing={instance.pricing} regions={regions} />
        </section>
    );
}

export function FamilySizes({ allOfInstanceType, instanceName }: { allOfInstanceType: AllOfInstanceType; instanceName: string }) {
    // This is a hack, but its a memo so that it runs immediately. We don't need a variable since its a mutation.
    useMemo(() => {
        return allOfInstanceType.sort((a, b) => {
            // sort by cpu and memory.
            if (a.cpus !== b.cpus) return a.cpus - b.cpus;
            const m = Number(a.memory) - Number(b.memory);
            if (m === 0) return a.name.localeCompare(b.name);
            return m;
        });
    }, [allOfInstanceType]);

    return (
        <section className="mb-4">
            <h3 className="flex items-center gap-2"><Server className="w-4 h-4 inline-block my-auto" /> Family Sizes</h3>
            <table className="mt-2 w-full text-sm">
                <thead>
                    <tr className="border-r border-gray-200">
                        <th className="text-left pb-1">Size</th>
                        <th className="text-left pb-1">vCPUs</th>
                        <th className="text-left pb-1">Memory (GiB)</th>
                    </tr>
                </thead>
                <tbody>
                    {allOfInstanceType.map((item) => {
                        let tdStyling = "border border-gray-200 p-1";
                        if (item.name === instanceName) tdStyling = "p-1";
                        return (
                            <tr key={item.name} className={
                                item.name === instanceName ? "bg-black text-white" : "odd:bg-gray-100"
                            }>
                                <td className={tdStyling}>
                                    {
                                        item.name === instanceName ? item.name : (
                                            <Link className="text-purple-1 hover:text-purple-0" href={`/aws/ec2/${item.name}`}>{item.name}</Link>
                                        )
                                    }
                                </td>
                                <td className={tdStyling}>{item.cpus}</td>
                                <td className={tdStyling}>{item.memory}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="mt-4 mb-6">
                <p className="text-center text-sm">
                    <Link href={`/?selected=${instanceName}`} className="p-2 border border-gray-200 hover:border-gray-300 rounded-md">
                        Compare {instanceName} to other instances
                    </Link>
                </p>
            </div>
        </section>
    );
}
