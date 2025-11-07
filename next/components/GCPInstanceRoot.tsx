"use client";

import type { GCPInstance } from "@/utils/colunnData/gcp";
import InstanceBreadcrumbs from "./InstanceBreadcrumbs";
import { FamilySize } from "./FamilySize";
import InstanceVariants from "./InstanceVariants";
import InstanceDataView from "./InstanceDataView";
import gcpTablesGenerator from "@/utils/gcpTablesGenerator";
import PricingCalculator from "./PricingCalculator";
import VantageDemo from "./VantageDemo";
import MarketingWrapper from "./MarketingWrapper";
import useStateWithCurrentQuerySeeded from "@/utils/useStateWithCurrentQuerySeeded";
import { MarketingSchema } from "@/schemas/marketing";
import type { CurrencyItem } from "@/utils/loadCurrencies";

type GCPInstanceRootProps = {
    rainbowTable: string[];
    compressedInstance: GCPInstance;
    allOfInstanceType: {
        name: string;
        cpus: number;
        memory: string | number;
    }[];
    regions: Record<string, string>;
    description: string;
    bestOfVariants: Record<string, string>;
    marketingData: MarketingSchema;
    currencies: CurrencyItem[];
};

const osOptions: [string, string][] = [
    ["linux", "Linux"],
    ["windows", "Windows"],
];

export default function GCPInstanceRoot({
    allOfInstanceType,
    compressedInstance,
    description,
    bestOfVariants,
    rainbowTable,
    regions,
    marketingData,
    currencies,
}: GCPInstanceRootProps) {
    const [pathSuffix, setPathSuffix] = useStateWithCurrentQuerySeeded();

    return (
        <MarketingWrapper instanceType="gcp" marketingData={marketingData}>
            <main className="my-4 px-4 not-md:w-screen">
                <InstanceBreadcrumbs
                    crumbs={[
                        { name: "GCP", href: "/gcp" },
                        { name: "Compute Engine", href: "/gcp" },
                        {
                            name: compressedInstance.pretty_name,
                            href: `/gcp/${compressedInstance.instance_type}`,
                        },
                    ]}
                />
                <div className="md:flex gap-8">
                    <div className="md:max-w-sm">
                        <h1 className="text-2xl font-bold mb-2">
                            {compressedInstance.pretty_name}
                        </h1>
                        <h2 className="text-sm mb-4">{description}</h2>
                        <PricingCalculator
                            currencies={currencies}
                            rainbowTable={rainbowTable}
                            compressedInstance={compressedInstance}
                            regions={{
                                main: {},
                                local_zone: regions,
                                wavelength: {},
                                china: {},
                            }}
                            defaultOs="linux"
                            removeSpot={false}
                            storeOsNameRatherThanId={false}
                            reservedTermOptions={[]}
                            osOptions={osOptions}
                            defaultRegion="us-east4"
                            useSpotMin={true}
                            setPathSuffix={setPathSuffix}
                        />
                        <VantageDemo link="https://www.vantage.sh/lp/gcp-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=details-sidebar" />
                        <FamilySize
                            allOfInstanceType={allOfInstanceType}
                            instanceName={compressedInstance.instance_type}
                            pathPrefix="/gcp"
                            tablePath="/gcp"
                            pathSuffix={pathSuffix}
                        />
                        <InstanceVariants
                            bestOfVariants={bestOfVariants}
                            pathPrefix="/gcp"
                            pathSuffix={pathSuffix}
                        />
                    </div>
                    <div className="not-xl:flex-grow xl:w-xl 2xl:w-2xl md:mt-0 mt-4">
                        <InstanceDataView
                            tables={gcpTablesGenerator(compressedInstance)}
                        />
                    </div>
                </div>
            </main>
        </MarketingWrapper>
    );
}
