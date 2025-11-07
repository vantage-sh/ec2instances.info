"use client";

import Filters from "@/components/Filters";
import InstanceTable from "@/components/InstanceTable";
import { useInstanceData } from "@/state";
import { GCPInstance } from "@/utils/colunnData/gcp";
import dynamicallyDecompress from "@/utils/dynamicallyDecompress";
import { useMemo } from "react";
import { MarketingSchema } from "@/schemas/marketing";
import Advert from "@/components/Advert";
import type { CurrencyItem } from "@/utils/loadCurrencies";

type Props = {
    instanceCount: number;
    regions: {
        [key: string]: string;
    };
    compressedDataPathTemplate: string;
    compressedInstances: [string[], ...GCPInstance[]];
    marketingData: MarketingSchema;
    currencies: CurrencyItem[];
};

export default function GCPClient({
    instanceCount,
    regions,
    compressedDataPathTemplate,
    compressedInstances,
    marketingData,
    currencies,
}: Props) {
    const initialInstances = useMemo(() => {
        const rainbowTable = compressedInstances.shift() as string[];
        if (!Array.isArray(rainbowTable)) {
            // This is probably dev.
            compressedInstances.unshift(rainbowTable);
            return compressedInstances as GCPInstance[];
        }
        return compressedInstances.map((instance) =>
            // @ts-expect-error: This is wrong, but close enough to work.
            dynamicallyDecompress(instance, rainbowTable),
        );
    }, [compressedInstances]);

    const allInstances = useInstanceData(
        compressedDataPathTemplate,
        // @ts-expect-error: This is wrong, but close enough to work.
        initialInstances,
    );

    const full =
        process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1"
            ? "h-[calc(100vh-6em)]"
            : "h-[calc(100vh-8.5em)]";

    return (
        <>
            <Advert
                marketingData={marketingData}
                instanceGroup="gcp-home"
                gpu={false}
            />
            <main className={`${full} overflow-y-hidden flex flex-col`}>
                <Filters
                    currencies={currencies}
                    columnAtomKey="gcp"
                    regions={{
                        local_zone: {},
                        main: regions,
                        wavelength: {},
                        china: {},
                    }}
                    reservedTermOptions={[]}
                    hideEcu={true}
                />
                <div className="flex-1 min-h-0">
                    <InstanceTable
                        instances={allInstances}
                        instanceCount={instanceCount}
                        columnAtomKey="gcp"
                    />
                </div>
            </main>
        </>
    );
}
