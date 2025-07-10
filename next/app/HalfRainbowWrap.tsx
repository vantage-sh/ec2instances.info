"use client";

import { Region } from "@/types";
import { AtomKeyWhereInstanceIs } from "@/components/InstanceTable";
import { decompressHalfRainbowTable } from "@/utils/halfRainbowTable";
import { useMemo } from "react";
import AWSClient from "./AWSClient";
import { MarketingSchema } from "@/schemas/marketing";

type Props<
    Instance extends {
        pricing: {
            [region: string]: {
                ondemand: any;
                reserved?: {
                    [term: string]: any;
                };
            };
        };
    },
> = {
    instances: Instance[];
    rainbowTable: string[];
    regions: Region;
    columnAtomKey: AtomKeyWhereInstanceIs<Instance>;
    marketingData: MarketingSchema;
};

export default function HalfRainbowWrap<
    Instance extends {
        pricing: {
            [region: string]: {
                ondemand: any;
                reserved?: {
                    [term: string]: any;
                };
            };
        };
        instance_type: string;
    },
>({
    instances,
    rainbowTable,
    regions,
    columnAtomKey,
    marketingData,
}: Props<Instance>) {
    const decompressed = useMemo(() => {
        return instances.map((instance) =>
            decompressHalfRainbowTable(rainbowTable, instance),
        );
    }, [instances, rainbowTable]);

    return (
        <AWSClient
            instances={decompressed}
            regions={regions}
            columnAtomKey={columnAtomKey}
            marketingData={marketingData}
        />
    );
}
