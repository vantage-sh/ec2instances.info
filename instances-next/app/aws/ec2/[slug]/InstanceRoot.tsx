import { EC2Instance, Region } from "@/types";
import { useMemo } from "react";
import { Server } from "lucide-react";
import Link from "next/link";
import { AllOfInstanceType, FamilySizes, PricingSelector } from "./client";
import InstanceDataView from "./InstanceDataView";

interface InstanceRootProps {
    rainbowTable: string[];
    compressedInstance: EC2Instance;
    description: string;
    bestOfVariants: {
        [key: string]: string;
    };
    allOfInstanceType: AllOfInstanceType;
    regions: Region;
}

function InstanceVariants({ bestOfVariants }: { bestOfVariants: { [key: string]: string } }) {
    const keys = useMemo(() => Object.keys(bestOfVariants).sort(
        (a, b) => a.localeCompare(b),
    ), [bestOfVariants]);

    return (
        <section>
            <h3 className="flex items-center gap-2"><Server className="w-4 h-4 inline-block my-auto" /> Instance Variants</h3>
            <table className="mt-2 w-full text-sm">
                <thead>
                    <tr className="border-r border-gray-200">
                        <th className="text-left pb-1">Variant</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map((key) => (
                        <tr key={key} className="odd:bg-gray-100">
                            <td className="border border-gray-200 p-1">
                                <Link className="text-purple-1 hover:text-purple-0" href={`/aws/ec2/${bestOfVariants[key]}`}>{key}</Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

export default function InstanceRoot({ rainbowTable, compressedInstance, description, bestOfVariants, allOfInstanceType, regions }: InstanceRootProps) {
    return (
        <main className="md:flex my-4 px-4 max-w-screen-lg mx-auto gap-8">
            <div className="md:max-w-sm">
                <h1 className="text-2xl font-bold mb-2">{compressedInstance.instance_type}</h1>
                <p className="text-sm mb-4">{description}</p>
                <PricingSelector rainbowTable={rainbowTable} compressedInstance={compressedInstance} regions={regions} />
                <FamilySizes allOfInstanceType={allOfInstanceType} instanceName={compressedInstance.instance_type} />
                <InstanceVariants bestOfVariants={bestOfVariants} />
                <p className="mt-6">
                    Having trouble making sense of your EC2 costs? Check out <a target="_blank" className="text-purple-1 hover:text-purple-0 underline" href="https://cur.vantage.sh">
                        cur.vantage.sh
                    </a> for an AWS billing code lookup tool.
                </p>
            </div>
            <div className="flex-grow md:mt-0 mt-4">
                <InstanceDataView instance={compressedInstance} />
            </div>
        </main>
    );
}
