import { Instance, Region } from "@/types";
import { readFile, writeFile } from "fs/promises";
import { encode } from "@msgpack/msgpack";
import { compress } from "lzma-native";
import addRenderInfo from "./addRenderInfo";

const PIPELINE_SIZE = 10;

function makeRainbowTable(instances: Instance[]) {
    // Pass 1: Get all the keys.
    const pricingSet = new Set<string>();
    for (const instance of instances) {
        const pricing = instance.pricing;
        for (const region in pricing) {
            pricingSet.add(region);
            for (const platform in pricing[region]) {
                pricingSet.add(platform);
                for (const key in pricing[region][platform]) {
                    pricingSet.add(key);
                }
                for (const term in pricing[region][platform].reserved || {}) {
                    pricingSet.add(term);
                }
            }
        }
    }

    // Pass 2: Mutate the instances to use the rainbow table.
    const rainbowTable = Array.from(pricingSet);
    for (const instance of instances) {
        const pricing = instance.pricing;
        const newPricing: [
            // Region
            number,
            [
                // Platform
                number,
                [
                    // Key inside platform
                    number,
                    any,
                ][],
            ][],
        ][] = [];
        for (const region in pricing) {
            const regionIndex = rainbowTable.indexOf(region);
            const platforms: [number, [number, any][]][] = [];
            for (const platform in pricing[region]) {
                const platformIndex = rainbowTable.indexOf(platform);
                const kv: [number, any][] = [];
                for (const key in pricing[region][platform]) {
                    const keyIndex = rainbowTable.indexOf(key);
                    if (key === "reserved") {
                        const reserved: [number, string][] = [];
                        for (const [key, value] of Object.entries(
                            pricing[region][platform].reserved || {},
                        )) {
                            reserved.push([rainbowTable.indexOf(key), value]);
                        }
                        kv.push([keyIndex, reserved]);
                    } else {
                        // @ts-expect-error: Doing some dangerous type stuff here.
                        kv.push([keyIndex, pricing[region][platform][key]]);
                    }
                }
                platforms.push([platformIndex, kv]);
            }
            newPricing.push([regionIndex, platforms]);
        }
        // @ts-expect-error: Doing some dangerous type stuff here.
        instance.pricing = newPricing;
    }
    return [rainbowTable, ...instances];
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
    const instanceCount = instances.length;
    await writeFile("./public/instance-count.txt", instanceCount.toString());
    await writeFile("./public/instance-ids.json", JSON.stringify(instances.map((i: Instance) => i.instance_type)));
    const first30Instances = instances.slice(0, 30);
    const first30InstancesEncoded = encode(makeRainbowTable(first30Instances));
    const remainingInstances: Instance[] = instances.slice(30);
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
