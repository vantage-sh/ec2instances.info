import { Region } from "@/types";
import { readFile } from "fs/promises";
import addRenderInfo from "@/utils/addRenderInfo";
import AWSClient from "../AWSClient";
import type { Instance } from "@/utils/colunnData/redshift";

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

    return (
        <AWSClient
            regions={regions}
            instances={instances as Instance[]}
            columnAtomKey="redshift"
        />
    );
}
