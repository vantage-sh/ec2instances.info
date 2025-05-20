import type { AzureInstance } from "@/utils/colunnData/azure";
import InstanceBreadcrumbs from "./InstanceBreadcrumbs";
import { FamilySize } from "./FamilySize";
import InstanceVariants from "./InstanceVariants";
import InstanceDataView from "./InstanceDataView";
import azureTablesGenerator from "@/utils/azureTablesGenerator";
import PricingCalculator from "./PricingCalculator";
import VantageDemo from "./VantageDemo";
import MarketingWrapper from "./MarketingWrapper";

type AzureInstanceRootProps = {
    rainbowTable: string[];
    compressedInstance: AzureInstance;
    allOfInstanceType: {
        name: string;
        cpus: number;
        memory: string | number;
    }[];
    regions: Record<string, string>;
    description: string;
    bestOfVariants: Record<string, string>;
};

const reservedTermOptions: [string, string][] = [
    ["Standard.allUpfront", "Reservation"],
    ["Standard.hybridbenefit", "Reservation (Hybrid Benefit)"],
    ["Savings.allUpfront", "Savings Plan"],
    ["Savings.hybridbenefit", "Savings Plan (Hybrid Benefit)"],
];

const osOptions: [string, string][] = [
    ["linux", "Linux"],
    ["windows", "Windows"],
];

export default function AzureInstanceRoot({
    allOfInstanceType,
    compressedInstance,
    description,
    bestOfVariants,
    rainbowTable,
    regions,
}: AzureInstanceRootProps) {
    return (
        <MarketingWrapper azure={true}>
            <main className="my-4 px-4 not-md:w-screen">
                <InstanceBreadcrumbs
                    crumbs={[
                        { name: "Azure", href: "/azure" },
                        { name: "VM", href: "/azure" },
                        {
                            name: compressedInstance.pretty_name,
                            href: `/azure/vm/${compressedInstance.instance_type}`,
                        },
                    ]}
                />
                <div className="md:flex gap-8">
                    <div className="md:max-w-sm">
                        <h1 className="text-2xl font-bold mb-2">
                            {compressedInstance.pretty_name}
                        </h1>
                        <p className="text-sm mb-4">{description}</p>
                        <PricingCalculator
                            rainbowTable={rainbowTable}
                            compressedInstance={compressedInstance}
                            regions={{
                                main: {},
                                local_zone: regions,
                                wavelength: {},
                            }}
                            defaultOs="linux"
                            removeSpot={false}
                            storeOsNameRatherThanId={false}
                            reservedTermOptions={reservedTermOptions}
                            osOptions={osOptions}
                            defaultRegion="us-east"
                            useSpotMin={true}
                        />
                        <VantageDemo link="https://www.vantage.sh/lp/azure-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=details-sidebar" />
                        <FamilySize
                            allOfInstanceType={allOfInstanceType}
                            instanceName={compressedInstance.instance_type}
                            pathPrefix="/azure/vm"
                            tablePath="/azure"
                        />
                        <InstanceVariants
                            bestOfVariants={bestOfVariants}
                            pathPrefix="/azure/vm"
                        />
                    </div>
                    <div className="not-xl:flex-grow xl:w-xl 2xl:w-2xl md:mt-0 mt-4">
                        <InstanceDataView
                            tables={azureTablesGenerator(compressedInstance)}
                        />
                    </div>
                </div>
            </main>
        </MarketingWrapper>
    );
}
