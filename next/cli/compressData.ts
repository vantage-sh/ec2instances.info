import { EC2Instance, Region } from "@/types";
import { readFile, writeFile } from "fs/promises";
import { encode } from "@msgpack/msgpack";
import { compress } from "lzma-native";
import addRenderInfo from "@/utils/addRenderInfo";
import makeRainbowTable from "@/utils/makeRainbowTable";
import formatAzureInstanceType from "@/utils/formatAzureInstanceType";
import { createHash } from "crypto";

const PIPELINE_SIZE = 10;

function hashInstances(instances: EC2Instance[]) {
    const j = JSON.stringify(instances);
    return createHash("sha256").update(j).digest("hex");
}

async function compressEC2Instances() {
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
        china: {},
    };
    const instances = JSON.parse(
        await readFile("../www/instances.json", "utf8"),
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

    // Add the China regions.
    const instancesCn = JSON.parse(
        await readFile("../www/instances-cn.json", "utf8"),
    );
    for (const instance of instancesCn) {
        for (const r in instance.pricing) {
            regions.china[r] = instance.regions[r];
        }
        const matchingInstance = instances.find(
            (i: EC2Instance) => i.instance_type === instance.instance_type,
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

    // Encode and then compress the EC2 instances.
    await writeFile("./public/instance-count.txt", instances.length.toString());
    await writeFile(
        "./public/instance-ids.json",
        JSON.stringify(instances.map((i: EC2Instance) => i.instance_type)),
    );
    await writeFile("./public/instances-hash.txt", hashInstances(instances));
    const first30Instances = instances.slice(0, 30);
    const first30InstancesEncoded = encode(makeRainbowTable(first30Instances));
    const remainingInstances: EC2Instance[] = instances.slice(30);
    await writeFile("./public/instances-regions.msgpack", encode(regions));
    await writeFile(
        "./public/first-30-instances.msgpack",
        first30InstancesEncoded,
    );
    const itemsPerPipeline = Math.ceil(
        remainingInstances.length / PIPELINE_SIZE,
    );
    const remainingPipelineLength =
        remainingInstances.length % itemsPerPipeline;

    console.log("Compressing EC2 instances data...");
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        let chunk = remainingInstances.slice(
            i * itemsPerPipeline,
            (i + 1) * itemsPerPipeline,
        );
        if (i === PIPELINE_SIZE - 1 && remainingPipelineLength > 0) {
            chunk = chunk.concat(
                remainingInstances.slice(
                    (i + 1) * itemsPerPipeline,
                    remainingInstances.length,
                ),
            );
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

    console.log("EC2 instances data compressed and saved");
}

async function compressAzureInstances() {
    const instances = JSON.parse(
        await readFile("../www/azure/instances.json", "utf8"),
    );
    for (const instance of instances) {
        formatAzureInstanceType(instance);
    }

    // Process the regions.
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
        china: {},
    };
    for (const instance of instances) {
        for (const r in instance.regions) {
            regions.main[r] = instance.regions[r];
        }
    }
    await writeFile("./public/azure-regions.json", JSON.stringify(regions));

    // Encode and then compress the Azure instances.
    await writeFile(
        "./public/azure-instance-count.txt",
        instances.length.toString(),
    );
    await writeFile(
        "./public/azure-instance-ids.json",
        JSON.stringify(
            instances.map((i: { instance_type: string }) => i.instance_type),
        ),
    );
    await writeFile(
        "./public/azure-instances-hash.txt",
        hashInstances(instances),
    );
    const first100Instances = instances.slice(0, 100);
    const first100InstancesEncoded = encode(
        makeRainbowTable(first100Instances),
    );
    const remainingInstances = instances.slice(100);
    await writeFile(
        "./public/first-100-azure-instances.msgpack",
        first100InstancesEncoded,
    );
    const itemsPerPipeline = Math.ceil(
        remainingInstances.length / PIPELINE_SIZE,
    );
    const remainingPipelineLength =
        remainingInstances.length % itemsPerPipeline;

    console.log("Compressing Azure instances data...");
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        let chunk = remainingInstances.slice(
            i * itemsPerPipeline,
            (i + 1) * itemsPerPipeline,
        );
        if (i === PIPELINE_SIZE - 1 && remainingPipelineLength > 0) {
            chunk = chunk.concat(
                remainingInstances.slice(
                    (i + 1) * itemsPerPipeline,
                    remainingInstances.length,
                ),
            );
        }
        const chunkEncoded = encode(makeRainbowTable(chunk));
        const compressedChunk: Buffer = await new Promise((res) => {
            compress(Buffer.from(chunkEncoded), {}, (result) => {
                res(result);
            });
        });
        await writeFile(
            `./public/remaining-azure-instances-p${i}.msgpack.xz`,
            compressedChunk,
        );
    }

    console.log("Azure instances data compressed and saved");
}

async function compressGCPInstances() {
    const instances = JSON.parse(
        await readFile("../www/gcp/instances.json", "utf8"),
    );

    // Process the regions.
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
        china: {},
    };
    for (const instance of instances) {
        // Use the regions field from the instance data which has nice names
        if (instance.regions) {
            for (const r in instance.regions) {
                regions.main[r] = instance.regions[r];
            }
        } else {
            // Fallback to using region code if regions field doesn't exist
            for (const r in instance.pricing) {
                regions.main[r] = r;
            }
        }
    }
    await writeFile("./public/gcp-regions.json", JSON.stringify(regions));

    // Encode and then compress the GCP instances.
    await writeFile(
        "./public/gcp-instance-count.txt",
        instances.length.toString(),
    );
    await writeFile(
        "./public/gcp-instance-ids.json",
        JSON.stringify(
            instances.map((i: { instance_type: string }) => i.instance_type),
        ),
    );
    await writeFile(
        "./public/gcp-instances-hash.txt",
        hashInstances(instances),
    );
    const first100Instances = instances.slice(0, 100);
    const first100InstancesEncoded = encode(
        makeRainbowTable(first100Instances),
    );
    const remainingInstances = instances.slice(100);
    await writeFile(
        "./public/first-100-gcp-instances.msgpack",
        first100InstancesEncoded,
    );
    const itemsPerPipeline = Math.ceil(
        remainingInstances.length / PIPELINE_SIZE,
    );
    const remainingPipelineLength =
        remainingInstances.length % itemsPerPipeline;

    console.log("Compressing GCP instances data...");
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        let chunk = remainingInstances.slice(
            i * itemsPerPipeline,
            (i + 1) * itemsPerPipeline,
        );
        if (i === PIPELINE_SIZE - 1 && remainingPipelineLength > 0) {
            chunk = chunk.concat(
                remainingInstances.slice(
                    (i + 1) * itemsPerPipeline,
                    remainingInstances.length,
                ),
            );
        }
        const chunkEncoded = encode(makeRainbowTable(chunk));
        const compressedChunk: Buffer = await new Promise((res) => {
            compress(Buffer.from(chunkEncoded), {}, (result) => {
                res(result);
            });
        });
        await writeFile(
            `./public/remaining-gcp-instances-p${i}.msgpack.xz`,
            compressedChunk,
        );
    }

    console.log("GCP instances data compressed and saved");
}

async function compressRDSInstances() {
    const regions: Region = {
        main: {},
        local_zone: {},
        wavelength: {},
        china: {},
    };
    const instances = JSON.parse(
        await readFile("../www/rds/instances.json", "utf8"),
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
        delete instance.regions;
    }

    // Add the China regions.
    const instancesCn = JSON.parse(
        await readFile("../www/rds/instances-cn.json", "utf8"),
    );
    for (const instance of instancesCn) {
        for (const r in instance.regions) {
            regions.china[r] = instance.regions[r];
        }
        const matchingInstance = instances.find(
            (i: EC2Instance) => i.instance_type === instance.instance_type,
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

    // Encode and then compress the RDS instances.
    console.log("Compressing RDS instances data...");
    await writeFile(
        "./public/instance-rds-count.txt",
        instances.length.toString(),
    );
    await writeFile("./public/instance-rds-hash.txt", hashInstances(instances));
    await writeFile(
        "./public/instance-rds-ids.json",
        JSON.stringify(instances.map((i: EC2Instance) => i.instance_type)),
    );
    const first30Instances = instances.slice(0, 30);
    const first30InstancesEncoded = encode(makeRainbowTable(first30Instances));
    await writeFile("./public/instance-rds-regions.msgpack", encode(regions));
    await writeFile(
        "./public/first-30-rds-instances.msgpack",
        first30InstancesEncoded,
    );
    const remainingInstances = instances.slice(30);
    const res = await new Promise<Buffer>((resolve) => {
        compress(
            Buffer.from(encode(makeRainbowTable(remainingInstances))),
            {},
            (result) => {
                resolve(result);
            },
        );
    });
    await writeFile("./public/remaining-rds-instances.msgpack.xz", res);
    console.log("RDS instances data compressed and saved");
}

async function main() {
    await compressEC2Instances();
    await compressAzureInstances();
    await compressGCPInstances();
    await compressRDSInstances();
}

main();
