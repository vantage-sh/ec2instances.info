import { EC2Instance, Region } from "@/types";
import { loadDataJsonXz } from "@/utils/loadDataAsset";
import addRenderInfo from "@/utils/addRenderInfo";
import AWSClient from "../AWSClient";
import makeRainbowTable from "@/utils/makeRainbowTable";
import type { Metadata } from "next";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";

export const metadata: Metadata = {
    title: "Amazon ElastiCache Instance Comparison",
    description:
        "A free and easy-to-use tool for comparing ElastiCache Instance features and prices.",
};

export default async function Cache() {
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
        china: {},
    };
    const instances = await loadDataJsonXz<any[]>(
        "data/cache/instances.json.xz",
    );
    for (const instance of instances) {
        addRenderInfo(instance);
        for (const r in instance.pricing) {
            if (r.includes("wl1") || r.includes("wl2")) {
                regions.wavelength[r] = instance.regions[r];
            } else if ((r.match(/\d+/g) || []).length > 1) {
                regions.local_zone[r] = instance.regions[r];
            } else {
                regions.main[r] = instance.regions[r];
            }
        }
    }

    const instancesCn = await loadDataJsonXz<any[]>(
        "data/cache/instances-cn.json.xz",
    );
    for (const instance of instancesCn) {
        for (const r in instance.regions) {
            regions.china[r] = instance.regions[r];
        }
        const matchingInstance = instances.find(
            (i: EC2Instance) => i.instance_type === instance.instance_type,
        );
        if (!matchingInstance) {
            console.warn(
                `Skipping stale China ElastiCache instance ${instance.instance_type} missing from instances.json`,
            );
            continue;
        }
        matchingInstance.pricing = {
            ...matchingInstance.pricing,
            ...instance.pricing,
        };
    }

    for (const instance of instances) {
        // Shave a few kb off the size.
        delete instance.regions;
    }

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

    const compressedData = makeRainbowTable(instances);

    return (
        <AWSClient
            currencies={currencies}
            regions={regions}
            compressedDataPathTemplate={null}
            compressedInstances={compressedData as [string[], ...EC2Instance[]]}
            instanceCount={instances.length}
            columnAtomKey="cache"
            marketingData={marketingData}
            savingsPlanSupported={["yrTerm1Savings.noUpfront"]}
        />
    );
}
