import { Region } from "@/types";
import { readFile } from "fs/promises";
import addRenderInfo from "@/utils/addRenderInfo";
import type { Instance } from "@/utils/colunnData/redshift";
import { makeHalfRainbowTable } from "@/utils/halfRainbowTable";
import HalfRainbowWrap from "../HalfRainbowWrap";

export default async function Redshift() {
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
    };
    const instances = JSON.parse(
        await readFile("../www/redshift/instances.json", "utf8"),
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

    const [rainbowTable, ...compressedInstances] = makeHalfRainbowTable(instances as Instance[]);

    return (
        <HalfRainbowWrap
            instances={compressedInstances}
            rainbowTable={rainbowTable}
            regions={regions}
            columnAtomKey="redshift"
        />
    );
}
