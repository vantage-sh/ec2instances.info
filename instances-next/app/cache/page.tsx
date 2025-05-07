import { EC2Instance, Region } from "@/types";
import { readFile } from "fs/promises";
import addRenderInfo from "@/utils/addRenderInfo";
import AWSClient from "../AWSClient";
import makeRainbowTable from "@/utils/makeRainbowTable";

export default async function Cache() {
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
    };
    const instances = JSON.parse(
        await readFile("../www/cache/instances.json", "utf8"),
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

    for (const instance of instances) {
        // Shave a few kb off the size.
        delete instance.regions;
    }

    const compressedData = makeRainbowTable(instances);

    return (
        <AWSClient
            regions={regions}
            compressedDataPathTemplate={null}
            compressedInstances={compressedData as [string[], ...EC2Instance[]]}
            instanceCount={instances.length}
            columnAtomKey="cache"
        />
    );
}
