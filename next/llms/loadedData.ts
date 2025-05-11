import { EC2Instance } from "@/types";
import { readFile } from "fs/promises";
import { XzReadableStream } from "xz-decompress";
import { decode } from "@msgpack/msgpack";
import processRainbowTable from "@/utils/processRainbowTable";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";
import { Instance as RedshiftInstance } from "@/utils/colunnData/redshift";
import { Instance as OpensearchInstance } from "@/utils/colunnData/opensearch";
import type { AzureInstance } from "@/utils/colunnData/azure";

export const awsInstances = (async () => {
    const compressed30 = decode(
        await readFile("./public/first-30-instances.msgpack"),
    ) as EC2Instance[];

    const remainingInstances: EC2Instance[] = [];
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        const compressed = await readFile(
            `./public/remaining-instances-p${i}.msgpack.xz`,
        );
        const stream = new XzReadableStream(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(compressed);
                    controller.close();
                },
            }),
        );
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const remaining = decode(Buffer.concat(chunks)) as EC2Instance[];
        // @ts-expect-error: The first item is the rainbow table.
        const rainbowTable: string[] = remaining.shift();
        remainingInstances.push(
            ...remaining.map((i) => processRainbowTable(rainbowTable, i)),
        );
    }
    // @ts-expect-error: The first item is the rainbow table.
    const first30RainbowTable: string[] = compressed30.shift();
    return [
        ...compressed30.map((i) => processRainbowTable(first30RainbowTable, i)),
        ...remainingInstances,
    ];
})();

export const rdsInstances = (async () => {
    const d = await readFile("../www/rds/instances.json", "utf-8");
    const i = JSON.parse(d) as EC2Instance[];
    for (const instance of i) {
        if ("vcpu" in instance) {
            // @ts-expect-error: Handle if vcpu is used instead.
            instance.vCPU = instance.vcpu;
        }
    }
    return i;
})();

export const elasticacheInstances = (async () => {
    const d = await readFile("../www/cache/instances.json", "utf-8");
    const i = JSON.parse(d) as EC2Instance[];
    for (const instance of i) {
        if ("vcpu" in instance) {
            // @ts-expect-error: Handle if vcpu is used instead.
            instance.vCPU = instance.vcpu;
        }
    }
    return i;
})();

export const redshiftInstances = (async () => {
    const d = await readFile("../www/redshift/instances.json", "utf-8");
    return JSON.parse(d) as RedshiftInstance[];
})();

export const opensearchInstances = (async () => {
    const d = await readFile("../www/opensearch/instances.json", "utf-8");
    return JSON.parse(d) as OpensearchInstance[];
})();

export const azureInstances = (async () => {
    const d = await readFile("../www/azure/instances.json", "utf-8");
    return JSON.parse(d) as AzureInstance[];
})();

export async function getEc2Families() {
    const instances = await awsInstances;
    const families = new Set<string>();
    for (const instance of instances) {
        families.add(instance.instance_type.split(".")[0]);
    }
    return Array.from(families).sort();
}

export async function getRdsFamilies() {
    const instances = await rdsInstances;
    const families = new Set<string>();
    for (const instance of instances) {
        const [family, version] = instance.instance_type.split(".", 3);
        families.add(`${family}.${version}`);
    }
    return Array.from(families).sort();
}

export async function getElasticacheFamilies() {
    const instances = await elasticacheInstances;
    const families = new Set<string>();
    for (const instance of instances) {
        const [family, version] = instance.instance_type.split(".", 3);
        families.add(`${family}.${version}`);
    }
    return Array.from(families).sort();
}

export async function getOpensearchFamilies() {
    const instances = await opensearchInstances;
    const families = new Set<string>();
    for (const instance of instances) {
        families.add(instance.instance_type.split(".")[0]);
    }
    return Array.from(families).sort();
}

export async function getAzureFamilies() {
    const instances = await azureInstances;
    const families = new Set<string>();
    for (const instance of instances) {
        families.add(instance.instance_type.substring(0, 2));
    }
    return Array.from(families).sort();
}
