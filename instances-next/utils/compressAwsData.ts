import { EC2Instance, Region } from "@/types";
import { readFile, writeFile } from "fs/promises";
import { encode } from "@msgpack/msgpack";
import { compress } from "lzma-native";
import addRenderInfo from "./addRenderInfo";
import makeRainbowTable from "./makeRainbowTable";
import { createHash } from "crypto";

const PIPELINE_SIZE = 10;

function hashInstances(instances: EC2Instance[]) {
    const j = JSON.stringify(instances);
    return createHash("sha256").update(j).digest("hex");
}

async function main() {
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
    };
    const instances = JSON.parse(
        await readFile("../www/instances.json", "utf8"),
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

    // Encode and then compress the instances.
    await writeFile("./public/instance-count.txt", instances.length.toString());
    await writeFile("./public/instance-ids.json", JSON.stringify(instances.map((i: EC2Instance) => i.instance_type)));
    await writeFile("./public/instances-hash.txt", hashInstances(instances));
    const first30Instances = instances.slice(0, 30);
    const first30InstancesEncoded = encode(makeRainbowTable(first30Instances));
    const remainingInstances: EC2Instance[] = instances.slice(30);
    await writeFile("./public/instances-regions.msgpack", encode(regions));
    await writeFile(
        "./public/first-30-instances.msgpack",
        first30InstancesEncoded,
    );
    const itemsPerPipeline = Math.ceil(remainingInstances.length / PIPELINE_SIZE);
    const remainingPipelineLength = remainingInstances.length % itemsPerPipeline;

    console.log("Compressing AWS instances data...");
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        let chunk = remainingInstances.slice(i * itemsPerPipeline, (i + 1) * itemsPerPipeline);
        if (i === PIPELINE_SIZE - 1 && remainingPipelineLength > 0) {
            chunk = chunk.concat(remainingInstances.slice((i + 1) * itemsPerPipeline, remainingInstances.length));
        }
        const chunkEncoded = encode(makeRainbowTable(chunk));
        const compressedChunk: Buffer = await new Promise((res) => {
            compress(Buffer.from(chunkEncoded), {}, (result) => {
                res(result);
            });
        });
        await writeFile(
            `./public/remaining-instances-p${i}.msgpack.xz`,
            compressedChunk,
        );
    }

    console.log("AWS instances data compressed and saved");
}

main();
