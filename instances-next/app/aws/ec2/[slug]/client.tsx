"use client";

import { Instance, Pricing, CostDuration, Region } from "@/types";
import { DollarSignIcon, Server } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useId } from "react";
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

    return `$${n * hourMultipliers[duration]}`;
}

function Calculator({ pricing, regions }: { pricing: Pricing; regions: Region }) {
    const priceHoldersId = useId();

    const defaultPlatform = useMemo(() => {
        return pricing["us-east-1"]?.["linux"] ?
            "linux" :
            Object.keys(pricing["us-east-1"] || {})[0] || "linux";
    }, [pricing]);

    const [region, setRegion] = useState<string>("us-east-1");
    const [platform, setPlatform] = useState<string>(defaultPlatform);
    const [duration, setDuration] = useState<CostDuration>("hourly");
    const [pricingType, setPricingType] = useState<string>("Standard.noUpfront");

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
                <div className="flex gap-4 w-full">
                    {prices.map(({ label, value }) => (
                        <div key={label} className="flex-col">
                            <p className="text-lg font-bold text-center">{value}</p>
                            <p className="text-xs text-center">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <select aria-controls={priceHoldersId} defaultValue={region} className={selectStyling} onChange={(e) => setRegion(e.target.value)}>
                    {localZones.map(([code, name]) => (
                        <option key={code} value={code} disabled={!pricing[code]}>{name}</option>
                    ))}
                </select>

                {
                    defaultPlatform === "linux" && (
                        <select aria-controls={priceHoldersId} defaultValue={platform} className={selectStyling} onChange={(e) => setPlatform(e.target.value)}>
                            <option value="linux">Linux</option>
                            <option value="mswin">Windows</option>
                            <option value="rhel">Red Hat</option>
                            <option value="sles">SUSE</option>
                            <option value="dedicated">Dedicated Host</option>
                            <option value="linuxSQL">Linux SQL Server</option>
                            <option value="linuxSQLWeb">Linux SQL Server for Web</option>
                            <option value="linuxSQLEnterprise">Linux SQL Enterprise</option>
                            <option value="mswinSQL">Windows SQL Server</option>
                            <option value="mswinSQLWeb">Windows SQL Web</option>
                            <option value="mswinSQLEnterprise">Windows SQL Enterprise</option>
                            <option value="rhelSQL">Red Hat SQL Server</option>
                            <option value="rhelSQLWeb">Red Hat SQL Web</option>
                            <option value="rhelSQLEnterprise">Red Hat SQL Enterprise</option>
                        </select>
                    )
                }

                <select aria-controls={priceHoldersId} defaultValue={duration} className={selectStyling} onChange={(e) => setDuration(e.target.value as CostDuration)}>
                    {
                        durationOptions.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))
                    }
                </select>

                <select aria-controls={priceHoldersId} defaultValue={pricingType} className={selectStyling} onChange={(e) => setPricingType(e.target.value)}>
                    <option value="Standard.noUpfront">No Upfront</option>
                    <option value="Standard.partialUpfront">Partial Upfront</option>
                    <option value="Standard.allUpfront">All Upfront</option>
                    <option value="Convertible.noUpfront">No Upfront (Convertible)</option>
                    <option value="Convertible.partialUpfront">Partial Upfront (Convertible)</option>
                    <option value="Convertible.allUpfront">All Upfront (Convertible)</option>
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
