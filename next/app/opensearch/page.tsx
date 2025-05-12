import { Region } from "@/types";
import { readFile } from "fs/promises";
import addRenderInfo from "@/utils/addRenderInfo";
import type { Instance } from "@/utils/colunnData/opensearch";
import { makeHalfRainbowTable } from "@/utils/halfRainbowTable";
import HalfRainbowWrap from "../HalfRainbowWrap";
import type { Metadata } from "next";

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
    };
    const instances = JSON.parse(
        await readFile("../www/opensearch/instances.json", "utf8"),
    );
    for (const instance of instances) {
        addRenderInfo(instance);
        for (const r in instance.pricing) {
            if (r.includes("wl1") || r.includes("wl2")) {
                regions.wavelength[r] = instance.regions[r];
            } else if (/\d+/.test(r)) {
                regions.local_zone[r] = instance.regions[r];
            } else {
                regions.main[r] = instance.regions[r];
            }
        }
    }

    const [rainbowTable, ...compressedInstances] = makeHalfRainbowTable(
        instances as Instance[],
    );

    return (
        <HalfRainbowWrap
            instances={compressedInstances}
            rainbowTable={rainbowTable}
            regions={regions}
            columnAtomKey="opensearch"
        />
    );
}
