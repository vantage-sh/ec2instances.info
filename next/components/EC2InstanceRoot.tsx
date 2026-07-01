"use client";

import { EC2Instance, Region } from "@/types";
import { AllOfInstanceType, FamilySize } from "./FamilySize";
import PricingCalculator from "@/components/PricingCalculator";
import * as tablesGenerator from "@/utils/ec2TablesGenerator";
import InstanceDataView from "./InstanceDataView";
import InstanceBreadcrumbs from "./InstanceBreadcrumbs";
import InstanceVariants from "./InstanceVariants";
import VantageDemo from "./VantageDemo";
import MarketingWrapper from "./MarketingWrapper";
import useStateWithCurrentQuerySeeded from "@/utils/useStateWithCurrentQuerySeeded";
import { MarketingSchema } from "@/schemas/marketing";
import type { CurrencyItem } from "@/utils/loadCurrencies";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/utils/locale";
import { useTranslations } from "gt-next";
import buildInstanceDescription from "@/utils/buildInstanceDescription";
import { formatNumber } from "@/utils/formatCurrency";

interface InstanceRootProps {
    rainbowTable: string[];
    compressedInstance: EC2Instance;
    ondemandCost: string;
    bestOfVariants: {
        [key: string]: string;
    };
    allOfInstanceType: AllOfInstanceType;
    regions: Region;
    osOptions: [string, string][];
    defaultOs: string;
    generatorKey: keyof typeof tablesGenerator;
    pathPrefix: string;
    removeSpot: boolean;
    tablePath: string;
    storeOsNameRatherThanId: boolean;
    reservedTermOptions: [string, string][];
    typeName: string;
    marketingInstanceType: string;
    marketingData: MarketingSchema;
    currencies: CurrencyItem[];
}

export default function EC2InstanceRoot({
    rainbowTable,
    compressedInstance,
    ondemandCost,
    bestOfVariants,
    allOfInstanceType,
    regions,
    osOptions,
    defaultOs,
    generatorKey,
    pathPrefix,
    removeSpot,
    tablePath,
    typeName,
    storeOsNameRatherThanId,
    reservedTermOptions,
    marketingInstanceType,
    marketingData,
    currencies,
}: InstanceRootProps) {
    const [pathSuffix, setPathSuffix] = useStateWithCurrentQuerySeeded();
    const [selectedPlatform, setSelectedPlatform] = useState(defaultOs);
    const generateTables = tablesGenerator[generatorKey] as (
        instance: EC2Instance,
        platform?: string,
    ) => tablesGenerator.Table[];
    const pathname = usePathname();
    const locale = getLocaleFromPath(pathname);
    const localePrefix = `/${locale}`;
    const t = useTranslations();

    // Format the on-demand cost with locale-aware number separators before
    // passing it to buildInstanceDescription (which always prefixes "$" for
    // this USD-denominated default price).
    const numericCost = Number(ondemandCost);
    const localizedCost = !isNaN(numericCost)
        ? formatNumber(numericCost, locale)
        : ondemandCost;

    // Generate translated description from the shared template.
    const description = buildInstanceDescription(
        t,
        compressedInstance,
        localizedCost,
    );

    return (
        <MarketingWrapper
            instanceType={marketingInstanceType}
            marketingData={marketingData}
        >
            <main className="my-4 px-4 not-md:w-screen">
                <InstanceBreadcrumbs
                    crumbs={[
                        { name: "AWS", href: localePrefix },
                        { name: typeName, href: `${localePrefix}${tablePath === "/" ? "" : tablePath}` },
                        {
                            name: compressedInstance.instance_type,
                            href: `${localePrefix}/${compressedInstance.instance_type}`,
                        },
                    ]}
                />
                <div className="md:flex gap-8">
                    <div className="md:max-w-sm">
                        <h1 className="text-2xl font-bold mb-2">
                            {compressedInstance.instance_type}
                        </h1>
                        <h2 className="text-sm mb-4">{description}</h2>
                        <PricingCalculator
                            currencies={currencies}
                            rainbowTable={rainbowTable}
                            compressedInstance={compressedInstance}
                            regions={regions}
                            osOptions={osOptions}
                            defaultOs={defaultOs}
                            removeSpot={removeSpot}
                            storeOsNameRatherThanId={storeOsNameRatherThanId}
                            reservedTermOptions={reservedTermOptions}
                            defaultRegion="us-east-1"
                            useSpotMin={false}
                            setPathSuffix={setPathSuffix}
                            onPlatformChange={setSelectedPlatform}
                        />
                        <VantageDemo link="https://www.vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=details-sidebar" />
                        <FamilySize
                            allOfInstanceType={allOfInstanceType}
                            instanceName={compressedInstance.instance_type}
                            pathPrefix={`${localePrefix}${pathPrefix}`}
                            tablePath={`${localePrefix}${tablePath === "/" ? "" : tablePath}`}
                            pathSuffix={pathSuffix}
                        />
                        <InstanceVariants
                            bestOfVariants={bestOfVariants}
                            pathPrefix={`${localePrefix}${pathPrefix}`}
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
                        <InstanceDataView
                            tables={generateTables(
                                compressedInstance,
                                selectedPlatform,
                            )}
                        />
                    </div>
                </div>
            </main>
        </MarketingWrapper>
    );
}
