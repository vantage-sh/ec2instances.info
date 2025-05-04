"use client";

import { Instance } from "@/types";

interface InstanceViewProps {
    instance: Instance;
    description: string;
    bestOfVariants: {
        [key: string]: string;
    };
    allOfInstanceType: {
        name: string;
        cpus: number;
        memory: string | number;
    }[];
}

function PricingSelector({ instance }: { instance: Instance }) {
    return null;
}

export default function InstanceView({ instance, description, bestOfVariants, allOfInstanceType }: InstanceViewProps) {
    return (
        <main className="md:flex my-4 max-w-screen-lg mx-auto gap-2">
            <div className="md:max-w-sm">
                <h1 className="text-2xl font-bold mb-2">{instance.instance_type}</h1>
                <p className="text-sm mb-4">{description}</p>
                <PricingSelector instance={instance} />
            </div>
            <div className="flex-grow">
                hello
            </div>
        </main>
    );
}
