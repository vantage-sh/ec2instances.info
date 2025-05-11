import { Pricing } from "@/types";
import { AllOfInstanceType, FamilySize } from "./FamilySize";
import { Region } from "@/types";
import PricingCalculator from "./PricingCalculator";
import VantageDemo from "./VantageDemo";
import InstanceBreadcrumbs from "./InstanceBreadcrumbs";
import MarketingWrapper from "./MarketingWrapper";
type HalfPricing = {
    [region: string]: {
        ondemand: string;
        reserved?: {
            [term: string]: string;
        };
    };
};

type InstanceRootProps<Instance extends { instance_type: string; pricing: HalfPricing }> = {
    allOfInstanceType: AllOfInstanceType;
    instance: Instance;
    description: string;
    children: React.ReactNode;
    pathPrefix: string;
    typeName: string;
    tablePath: string;
    regions: Region;
};

const reservedTermOptions: [string, string][] = [
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
];

export default function HalfEC2Root<Instance extends { instance_type: string; pricing: HalfPricing }>({
    allOfInstanceType,
    instance,
    description,
    children,
    pathPrefix,
    typeName,
    tablePath,
    regions,
}: InstanceRootProps<Instance>) {
    const remappedPricing: Pricing = {};
    for (const region in instance.pricing) {
        remappedPricing[region] = {
            "single": {
                ondemand: instance.pricing[region].ondemand,
                reserved: instance.pricing[region].reserved,
            },
        };
    }

    return (
        <MarketingWrapper azure={false}>
            <main className="my-4 px-4 max-w-screen-lg not-md:w-screen">
                <InstanceBreadcrumbs crumbs={[
                    { name: "AWS", href: "/" },
                    { name: typeName, href: tablePath },
                    { name: instance.instance_type, href: `/${instance.instance_type}` },
                ]} />
                <div className="md:flex gap-8">
                    <div className="md:max-w-sm">
                        <h1 className="text-2xl font-bold mb-2">
                            {instance.instance_type}
                        </h1>
                        <p className="text-sm mb-4">{description}</p>
                        <PricingCalculator
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
                        />
                        <VantageDemo
                            link="https://www.vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=details-sidebar"
                        />
                        <FamilySize
                            allOfInstanceType={allOfInstanceType}
                            instanceName={instance.instance_type}
                            pathPrefix={pathPrefix}
                            tablePath={tablePath}
                        />
                        <p className="mt-6">
                            Having trouble making sense of your EC2 costs? Check out{" "}
                            <a
                                target="_blank"
                                className="text-purple-1 hover:text-purple-0 underline"
                                href="https://cur.vantage.sh"
                            >
                                cur.vantage.sh
                            </a>{" "}
                            for an AWS billing code lookup tool.
                        </p>
                    </div>
                    <div className="flex-grow md:mt-0 mt-4">
                        {children}
                    </div>
                </div>
            </main>
        </MarketingWrapper>
    );
}
