"use client";

import Filters from "@/components/Filters";
import InstanceTable from "@/components/InstanceTable";
import { useInstanceData } from "@/state";
import { AzureInstance } from "@/utils/colunnData/azure";
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
    compressedInstances: [string[], ...AzureInstance[]];
    marketingData: MarketingSchema;
    currencies: CurrencyItem[];
};

export default function AzureClient({
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
            return compressedInstances as AzureInstance[];
        }
        return compressedInstances.map(
            (instance) =>
                // @ts-expect-error: This is wrong, but close enough to work.
                dynamicallyDecompress(instance, rainbowTable) as AzureInstance,
        );
    }, [compressedInstances]);

    const allInstances = useInstanceData(
        compressedDataPathTemplate,
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
                instanceGroup="azure-home"
                gpu={false}
            />
            <main className={`${full} overflow-y-hidden flex flex-col`}>
                <Filters
                    currencies={currencies}
                    columnAtomKey="azure"
                    regions={{
                        local_zone: {},
                        main: regions,
                        wavelength: {},
                        china: {},
                    }}
                    ecuRename="ACU"
                    reservedTermOptions={[
                        {
                            value: "yrTerm1Standard.allUpfront",
                            label: "No Hybrid Benefit - 1 Year",
                        },
                        {
                            value: "yrTerm3Standard.allUpfront",
                            label: "No Hybrid Benefit - 3 Year",
                        },
                        {
                            value: "yrTerm1Standard.hybridbenefit",
                            label: "Hybrid Benefit - 1 Year",
                        },
                        {
                            value: "yrTerm3Standard.hybridbenefit",
                            label: "Hybrid Benefit - 3 Year",
                        },
                    ]}
                    reservedLabel="Hybrid Benefit"
                />
                <div className="flex-1 min-h-0">
                    <InstanceTable
                        instances={allInstances}
                        instanceCount={instanceCount}
                        columnAtomKey="azure"
                        ecuRename="ACU"
                    />
                </div>
            </main>
        </>
    );
}
