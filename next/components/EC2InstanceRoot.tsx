import { EC2Instance, Region } from "@/types";
import { AllOfInstanceType, FamilySize } from "./FamilySize";
import PricingCalculator from "@/components/PricingCalculator";
import * as tablesGenerator from "@/utils/ec2TablesGenerator";
import InstanceDataView from "./InstanceDataView";
import InstanceBreadcrumbs from "./InstanceBreadcrumbs";
import InstanceVariants from "./InstanceVariants";
import VantageDemo from "./VantageDemo";
import MarketingWrapper from "./MarketingWrapper";

interface InstanceRootProps {
    rainbowTable: string[];
    compressedInstance: EC2Instance;
    description: string;
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
}

export default function EC2InstanceRoot({
    rainbowTable,
    compressedInstance,
    description,
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
}: InstanceRootProps) {
    return (
        <MarketingWrapper azure={false}>
            <main className="my-4 px-4 max-w-screen-lg not-md:w-screen">
                <InstanceBreadcrumbs
                    crumbs={[
                        { name: "AWS", href: "/" },
                        { name: typeName, href: tablePath },
                        {
                            name: compressedInstance.instance_type,
                            href: `/${compressedInstance.instance_type}`,
                        },
                    ]}
                />
                <div className="md:flex gap-8">
                    <div className="md:max-w-sm">
                        <h1 className="text-2xl font-bold mb-2">
                            {compressedInstance.instance_type}
                        </h1>
                        <p className="text-sm mb-4">{description}</p>
                        <PricingCalculator
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
                        />
                        <VantageDemo link="https://www.vantage.sh/lp/aws-instances-demo?utm_campaign=Instances%20Blog%20Clicks&utm_source=details-sidebar" />
                        <FamilySize
                            allOfInstanceType={allOfInstanceType}
                            instanceName={compressedInstance.instance_type}
                            pathPrefix={pathPrefix}
                            tablePath={tablePath}
                        />
                        <InstanceVariants
                            bestOfVariants={bestOfVariants}
                            pathPrefix={pathPrefix}
                        />
                        <p className="mt-6">
                            Having trouble making sense of your EC2 costs? Check
                            out{" "}
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
                        <InstanceDataView
                            tables={tablesGenerator[generatorKey](
                                compressedInstance,
                            )}
                        />
                    </div>
                </div>
            </main>
        </MarketingWrapper>
    );
}
