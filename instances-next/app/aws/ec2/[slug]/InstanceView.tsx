"use client";

import { Instance } from "@/types";
import { useMemo } from "react";
import { DollarSignIcon, Server } from "lucide-react";
import Link from "next/link";

type AllOfInstanceType = {
    name: string;
    cpus: number;
    memory: string | number;
}[];

interface InstanceViewProps {
    instance: Instance;
    description: string;
    bestOfVariants: {
        [key: string]: string;
    };
    allOfInstanceType: AllOfInstanceType;
}

function PricingSelector({ instance }: { instance: Instance }) {
    return (
        <section className="mb-4">
            <h3 className="flex items-center gap-2"><DollarSignIcon className="w-4 h-4 inline-block my-auto" /> Pricing</h3>
            <p className="text-sm">
                hello    
            </p>
        </section>
    )
}

function FamilySizes({ allOfInstanceType, instance }: { allOfInstanceType: AllOfInstanceType; instance: Instance }) {
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
                        if (item.name === instance.instance_type) tdStyling = "p-1";
                        return (
                            <tr key={item.name} className={
                                item.name === instance.instance_type ? "bg-black text-white" : "odd:bg-gray-100"
                            }>
                                <td className={tdStyling}>
                                    {
                                        item.name === instance.instance_type ? item.name : (
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
                    <Link href={`/?selected=${instance.instance_type}`} className="p-2 border border-gray-200 hover:border-gray-300 rounded-md">
                        Compare {instance.instance_type} to other instances
                    </Link>
                </p>
            </div>
        </section>
    )
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

export default function InstanceView({ instance, description, bestOfVariants, allOfInstanceType }: InstanceViewProps) {
    return (
        <main className="md:flex my-4 max-w-screen-lg mx-auto gap-8">
            <div className="md:max-w-sm">
                <h1 className="text-2xl font-bold mb-2">{instance.instance_type}</h1>
                <p className="text-sm mb-4">{description}</p>
                <PricingSelector instance={instance} />
                <FamilySizes allOfInstanceType={allOfInstanceType} instance={instance} />
                <InstanceVariants bestOfVariants={bestOfVariants} />
                <p className="mt-6">
                    Having trouble making sense of your EC2 costs? Check out <a target="_blank" className="text-purple-1 hover:text-purple-0 underline" href="https://cur.vantage.sh">
                        cur.vantage.sh
                    </a> for an AWS billing code lookup tool.
                </p>
            </div>
            <div className="flex-grow">
                hello
            </div>
        </main>
    );
}
