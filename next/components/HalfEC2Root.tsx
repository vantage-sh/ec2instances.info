"use client";

import { Pricing } from "@/types";
import { AllOfInstanceType, FamilySize } from "./FamilySize";
import { Region } from "@/types";
import PricingCalculator from "./PricingCalculator";
import VantageDemo from "./VantageDemo";
import InstanceBreadcrumbs from "./InstanceBreadcrumbs";
import MarketingWrapper from "./MarketingWrapper";
import useStateWithCurrentQuerySeeded from "@/utils/useStateWithCurrentQuerySeeded";
import { useMemo } from "react";
import { MarketingSchema } from "@/schemas/marketing";
import type { CurrencyItem } from "@/utils/loadCurrencies";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/utils/locale";
import { useTranslations } from "gt-next";

type HalfPricing = {
    [region: string]: {
        ondemand: string;
        reserved?: {
            [term: string]: string;
        };
    };
};

type InstanceRootProps<
    Instance extends { instance_type: string; pricing: HalfPricing },
> = {
    allOfInstanceType: AllOfInstanceType;
    instance: Instance;
    description: string;
    children: React.ReactNode;
    pathPrefix: string;
    typeName: string;
    tablePath: string;
    regions: Region;
    instanceType: string;
    marketingData: MarketingSchema;
    currencies: CurrencyItem[];
};

const reservedTermOptions: [string, string][] = [
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
];

export default function HalfEC2Root<
    Instance extends { instance_type: string; pricing: HalfPricing },
>({
    allOfInstanceType,
    instance,
    description,
    children,
    pathPrefix,
    typeName,
    tablePath,
    regions,
    instanceType,
    marketingData,
    currencies,
}: InstanceRootProps<Instance>) {
    const remappedPricing = useMemo(() => {
        const remappedPricing: Pricing = {};
        for (const region in instance.pricing) {
            remappedPricing[region] = {
                single: {
                    ondemand: instance.pricing[region].ondemand,
                    reserved: instance.pricing[region].reserved,
                },
            };
        }
        return remappedPricing;
    }, [instance.pricing]);
    const [pathSuffix, setPathSuffix] = useStateWithCurrentQuerySeeded();
    const pathname = usePathname();
    const locale = getLocaleFromPath(pathname);
    const localePrefix = `/${locale}`;
    const t = useTranslations();

    return (
        <MarketingWrapper
            instanceType={instanceType}
            marketingData={marketingData}
        >
            <main className="my-4 px-4 not-md:w-screen">
                <InstanceBreadcrumbs
                    crumbs={[
                        { name: "AWS", href: localePrefix },
                        { name: typeName, href: `${localePrefix}${tablePath === "/" ? "" : tablePath}` },
                        {
                            name: instance.instance_type,
                            href: `${localePrefix}/${instance.instance_type}`,
                        },
                    ]}
                />
                <div className="md:flex gap-8">
                    <div className="md:max-w-sm">
                        <h1 className="text-2xl font-bold mb-2">
                            {instance.instance_type}
                        </h1>
                        <h2 className="text-sm mb-4">{description}</h2>
                        <PricingCalculator
                            currencies={currencies}
                            rainbowTable={[]}
                            compressedInstance={{
                                pricing: remappedPricing,
                            }}
                            regions={regions}
                            osOptions={[]}
                            defaultOs="unused"
                            removeSpot={true}
                            storeOsNameRatherThanId={false}
                            reservedTermOptions={reservedTermOptions}
                            defaultRegion="us-east-1"
                            useSpotMin={false}
                            setPathSuffix={setPathSuffix}
                        />
                        <VantageDemo link="https://www.vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=details-sidebar" />
                        <FamilySize
                            allOfInstanceType={allOfInstanceType}
                            instanceName={instance.instance_type}
                            pathPrefix={`${localePrefix}${pathPrefix}`}
                            tablePath={`${localePrefix}${tablePath === "/" ? "" : tablePath}`}
                            pathSuffix={pathSuffix}
                        />
                        <p className="mt-6">
                            {t("instancePage.ec2CostHelp")}{" "}
                            <a
                                target="_blank"
                                className="text-purple-1 hover:text-purple-0 underline"
                                href="https://cur.vantage.sh"
                            >
                                cur.vantage.sh
                            </a>{" "}
                            {t("instancePage.ec2CostHelpSuffix")}
                        </p>
                    </div>
                    <div className="not-xl:flex-grow xl:w-xl 2xl:w-2xl md:mt-0 mt-4">
                        {children}
                    </div>
                </div>
            </main>
        </MarketingWrapper>
    );
}
