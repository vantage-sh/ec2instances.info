import type { InstanceOverlay } from "./worker";
import { fork } from "child_process";
import type { EC2Instance } from "@/types";
import { readFileSync } from "fs";
import path from "path";
import sharp from "sharp";

function manyOf<T>(n: number, fn: () => T): T[] {
    return Array.from({ length: n }, fn);
}

const vantageOgNote = `
NOTE: OpenGraph image generation is currently using a Vantage background, owned by Vantage. It is not MIT licensed! It is totally fine to use this in development, but if you aren't Vantage and deploying to production, please set OPENGRAPH_URL to something else. Ideally, make this image 1911x1156.
`;

const baseRes = (async () => {
    let e = process.env.OPENGRAPH_URL;
    if (!e) {
        e = "https://instances.vantage.sh/opengraph_bg.jpg";
        console.log(vantageOgNote);
    }
    return fetch(e).then(async (r) => {
        if (!r.ok) throw new Error(`Image returned response ${r.status}`);
        const v = await r.arrayBuffer();
        return sharp(v)
            .resize(1911, 1156, {
                fit: "fill",
            })
            .png()
            .toBuffer();
    });
})();

const resolvers = new Map<number, () => void>();
const workers = manyOf(20, async () => {
    // Spawn the worker
    const worker = fork(`${__dirname}/worker.ts`);
    worker.on("message", (message: number) => {
        const resolver = resolvers.get(message);
        if (resolver) {
            resolver();
            resolvers.delete(message);
        }
    });
    worker.on("error", () => {
        process.exit(1);
    });

    // The first message is the base image
    worker.send([await baseRes, -1]);

    // Return the worker
    return worker;
});

let idSeq = 0;

async function pushToWorker(overlay: InstanceOverlay) {
    const worker = await workers[Math.floor(Math.random() * workers.length)];
    const reqId = idSeq++;
    return new Promise<void>((resolve) => {
        resolvers.set(reqId, () => {
            resolve();
        });
        worker.send([overlay, reqId]);
    });
}

const allPromises: Promise<void>[] = [];

const ec2Instances = JSON.parse(
    readFileSync(
        path.join(__dirname, "..", "..", "www", "instances.json"),
        "utf-8",
    ),
) as EC2Instance[];

for (const instance of ec2Instances) {
    allPromises.push(
        pushToWorker({
            name: instance.instance_type,
            categoryHeader: "EC2 Instances",
            filename: path.join(
                __dirname,
                "..",
                "public",
                "aws",
                "ec2",
                `${instance.instance_type}.png`,
            ),
            values: [
                {
                    name: "CPU Cores",
                    value: instance.vCPU.toString(),
                    squareIconPath: "icons/cpu.png",
                },
            ],
        }),
    );
}

async function main() {
    await Promise.all(allPromises);
    await Promise.all(workers).then((ws) => {
        for (const w of ws) {
            w.kill();
        }
    });
    console.log("Done!");
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
