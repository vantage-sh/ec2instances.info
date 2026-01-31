import { Region } from "@/types";
import { readFile } from "fs/promises";
import addRenderInfo from "@/utils/addRenderInfo";
import type { Instance } from "@/utils/colunnData/opensearch";
import { makeHalfRainbowTable } from "@/utils/halfRainbowTable";
import HalfRainbowWrap from "../HalfRainbowWrap";
import type { Metadata } from "next";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";

export const metadata: Metadata = {
    title: "Amazon OpenSearch, Open-Source Elasticsearch, Instance Comparison",
    description:
        "A free and easy-to-use tool for comparing OpenSearch Instance features and prices.",
};

export default async function OpenSearch() {
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
        china: {},
    };
    const instances = JSON.parse(
        await readFile("../www/opensearch/instances.json", "utf8"),
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

    const instancesCn = JSON.parse(
        await readFile("../www/opensearch/instances-cn.json", "utf8"),
    );
    for (const instance of instancesCn) {
        for (const r in instance.regions) {
            regions.china[r] = instance.regions[r];
        }
        const matchingInstance = instances.find(
            (i: Instance) => i.instance_type === instance.instance_type,
        );
        if (!matchingInstance) {
            throw new Error(
                `Instance ${instance.instance_type} not found in instances.json`,
            );
        }
        matchingInstance.pricing = {
            ...matchingInstance.pricing,
            ...instance.pricing,
        };
    }

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

    const [rainbowTable, ...compressedInstances] = makeHalfRainbowTable(
        instances as Instance[],
    );

    return (
        <HalfRainbowWrap
            currencies={currencies}
            instances={compressedInstances}
            rainbowTable={rainbowTable}
            regions={regions}
            columnAtomKey="opensearch"
            marketingData={marketingData}
        />
    );
}
