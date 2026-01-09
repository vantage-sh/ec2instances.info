"use client";

import { useMemo } from "react";
import { Server } from "lucide-react";
import TranslationFriendlyLink from "./TranslationFriendlyLink";

export type AllOfInstanceType = {
    name: string;
    cpus: number;
    memory: string | number;
}[];

export function FamilySize({
    allOfInstanceType,
    instanceName,
    pathPrefix,
    tablePath,
    pathSuffix,
}: {
    allOfInstanceType: AllOfInstanceType;
    instanceName: string;
    pathPrefix: string;
    tablePath: string;
    pathSuffix: string;
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
                    <tr className="border-r border-gray-200 dark:border-gray-3">
                        <th className="text-left pb-1 pl-2">Size</th>
                        <th className="text-left pb-1 pl-2">vCPUs</th>
                        <th className="text-left pb-1 pl-2">Memory (GiB)</th>
                    </tr>
                </thead>
                <tbody>
                    {allOfInstanceType.map((item) => {
                        let tdStyling =
                            "border border-gray-200 dark:border-gray-3 p-1 py-2 pl-2";
                        if (item.name === instanceName)
                            tdStyling = "p-1 py-2 pl-2";
                        return (
                            <tr
                                key={item.name}
                                className={
                                    item.name === instanceName
                                        ? "bg-black text-white dark:bg-gray-4"
                                        : "odd:bg-gray-100 dark:odd:bg-black"
                                }
                            >
                                <td className={tdStyling}>
                                    {item.name === instanceName ? (
                                        item.name
                                    ) : (
                                        <TranslationFriendlyLink
                                            className="text-purple-1 hover:text-purple-0"
                                            href={`${pathPrefix}/${item.name}${pathSuffix}`}
                                        >
                                            {item.name}
                                        </TranslationFriendlyLink>
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
                    <TranslationFriendlyLink
                        href={`${tablePath}?selected=${instanceName}`}
                        className="p-2 border border-gray-200 hover:border-gray-300 dark:border-gray-3 dark:hover:border-gray-2 rounded-md"
                    >
                        Compare {instanceName} to other instances
                    </TranslationFriendlyLink>
                </p>
            </div>
        </section>
    );
}
