"use client";

import { useInstanceData } from "@/state";
import InstanceTable from "@/components/InstanceTable";
import { Region, Pricing } from "@/types";
import Filters from "@/components/Filters";
import { useMemo } from "react";
import dynamicallyDecompress from "@/utils/dynamicallyDecompress";
import { AtomKeyWhereInstanceIs } from "@/components/InstanceTable";
import { reservedTermOptions } from "@/utils/dataMappings";
import { MarketingSchema } from "@/schemas/marketing";
import Advert from "@/components/Advert";

type RootProps<Instance extends { instance_type: string }> = {
    columnAtomKey: AtomKeyWhereInstanceIs<Instance>;
    regions: Region;
    marketingData: MarketingSchema;
};

type AWSClientProps<
    Instance extends { instance_type: string; pricing: Pricing },
> = RootProps<Instance> &
    (
        | {
              compressedDataPathTemplate: string | null;
              compressedInstances: [string[], ...Instance[]];
              instanceCount: number;
              instances?: undefined;
          }
        | {
              compressedInstances?: undefined;
              instances: Instance[];
              instanceCount?: undefined;
          }
    );

type AWSDecompressionClientProps<
    Instance extends { instance_type: string; pricing: Pricing },
> = RootProps<Instance> & {
    compressedDataPathTemplate: string | null;
    compressedInstances: [string[], ...Instance[]];
    instanceCount: number;
    instances?: undefined;
};

type AWSAllInstancesClientProps<Instance extends { instance_type: string }> =
    RootProps<Instance> & {
        instances: Instance[];
        compressedDataPathTemplate?: undefined;
        compressedInstances?: undefined;
        instanceCount?: undefined;
    };

export default function AWSClient<Instance extends { instance_type: string }>(
    props: AWSAllInstancesClientProps<Instance>,
): JSX.Element;
export default function AWSClient<
    Instance extends { instance_type: string; pricing: Pricing },
>(props: AWSDecompressionClientProps<Instance>): JSX.Element;
export default function AWSClient<
    Instance extends { instance_type: string; pricing: Pricing },
>(props: AWSClientProps<Instance>): JSX.Element {
    const initialInstances = useMemo(() => {
        if (props.compressedInstances) {
            const rainbowTable = props.compressedInstances.shift() as string[];
            if (!Array.isArray(rainbowTable)) {
                // This is probably dev.
                props.compressedInstances.unshift(rainbowTable);
                return props.compressedInstances as Instance[];
            }
            return props.compressedInstances.map((instance) =>
                dynamicallyDecompress(instance as Instance, rainbowTable),
            );
        }
        return null;
    }, [props.compressedInstances, props.instances]);

    let instances: Instance[];
    if (props.compressedInstances) {
        instances = useInstanceData(
            props.compressedDataPathTemplate,
            initialInstances!,
        );
    } else {
        instances = props.instances;
    }

    const full =
        process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1"
            ? "h-[calc(100vh-6em)]"
            : "h-[calc(100vh-8.5em)]";

    return (
        <>
            <Advert
                marketingData={props.marketingData}
                instanceGroup={props.columnAtomKey}
                gpu={false}
            />
            <main className={`${full} overflow-y-hidden flex flex-col`}>
                <Filters
                    columnAtomKey={props.columnAtomKey}
                    regions={props.regions}
                    reservedTermOptions={reservedTermOptions}
                />
                <div className="flex-1 min-h-0">
                    <InstanceTable
                        instances={instances}
                        instanceCount={props.instanceCount ?? instances.length}
                        columnAtomKey={props.columnAtomKey}
                    />
                </div>
            </main>
        </>
    );
}
