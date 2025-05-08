"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Server } from "lucide-react";

export type AllOfInstanceType = {
    name: string;
    cpus: number;
    memory: string | number;
}[];

export function EC2FamilySizes({
    allOfInstanceType,
    instanceName,
    pathPrefix,
    tablePath,
}: {
    allOfInstanceType: AllOfInstanceType;
    instanceName: string;
    pathPrefix: string;
    tablePath: string;
}) {
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
            <h3 className="flex items-center gap-2">
                <Server className="w-4 h-4 inline-block my-auto" /> Family Sizes
            </h3>
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
                            <tr
                                key={item.name}
                                className={
                                    item.name === instanceName
                                        ? "bg-black text-white"
                                        : "odd:bg-gray-100"
                                }
                            >
                                <td className={tdStyling}>
                                    {item.name === instanceName ? (
                                        item.name
                                    ) : (
                                        <Link
                                            className="text-purple-1 hover:text-purple-0"
                                            href={`${pathPrefix}/${item.name}`}
                                        >
                                            {item.name}
                                        </Link>
                                    )}
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
                    <Link
                        href={`${tablePath}?selected=${instanceName}`}
                        className="p-2 border border-gray-200 hover:border-gray-300 rounded-md"
                    >
                        Compare {instanceName} to other instances
                    </Link>
                </p>
            </div>
        </section>
    );
}
