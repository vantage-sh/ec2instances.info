import { Instance, Region } from "@/types";
import { readFile, writeFile } from "fs/promises";
import { encode } from "@msgpack/msgpack";
import { compress } from "lzma-native";

function networkSort(instance: Instance) {
    const perf = instance.network_performance;
    const network_rank = [
        "Very Low",
        "Low",
        "Low to Moderate",
        "Moderate",
        "High",
        "Up to 5 Gigabit",
        "Up to 10 Gigabit",
        "10 Gigabit",
        "12 Gigabit",
        "20 Gigabit",
        "Up to 25 Gigabit",
        "25 Gigabit",
        "50 Gigabit",
        "75 Gigabit",
        "100 Gigabit",
    ];
    try {
        const sort = network_rank.indexOf(perf);
        return sort * 2;
    } catch {
        return network_rank.length * 2;
    }
}

function addCpuDetail(instance: Instance) {
    if (typeof instance.ECU === "number" && typeof instance.vCPU === "number") {
        instance.ECU_per_vcpu = instance.ECU / instance.vCPU;
    } else {
        instance.ECU_per_vcpu = "unknown";
    }
    if (typeof instance.vCPU === "number") {
        instance.memory_per_vcpu =
            Math.round((instance.memory / instance.vCPU) * 100) / 100;
    } else {
        instance.memory_per_vcpu = "unknown";
    }
    if (instance.physical_processor) {
        instance.physical_processor = instance.physical_processor.replace(
            "*",
            "",
        );
    }
}
function addRenderInfo(instance: Instance) {
    try {
        instance.network_sort = networkSort(instance);
    } catch {}
    addCpuDetail(instance);
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
    const first50Instances = instances.slice(0, 50);
    const remainingInstances = instances.slice(50);
    const first50InstancesEncoded = encode(first50Instances);
    const remainingInstancesEncoded = encode(remainingInstances);
    console.log("Compressing AWS instances data...");
    const compressedRemainingInstances: Buffer = await new Promise((res) => {
        compress(Buffer.from(remainingInstancesEncoded), {}, (result) => {
            res(result);
        });
    });

    await writeFile(
        "./public/instances-regions.msgpack",
        encode(regions),
    );
    await writeFile(
        "./public/first-50-instances.msgpack",
        first50InstancesEncoded,
    );
    await writeFile(
        "./public/remaining-instances.msgpack.xz",
        compressedRemainingInstances,
    );
    console.log("AWS instances data compressed and saved");
}

main();
