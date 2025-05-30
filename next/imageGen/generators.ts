import { readFileSync } from "fs";
import path from "path";
import type { EC2Instance } from "../types";
import { pushToWorker } from "./shared";

function formatStorage(storage: EC2Instance["storage"]) {
    if (!storage) {
        return "EBS only";
    }
    return `${storage.size} ${storage.size_unit}`;
}

const ONLY_INSTANCES = process.env.ONLY_INSTANCES?.split(",") || [];

export function generateEc2Images() {
    const ec2Instances = JSON.parse(
        readFileSync(
            path.join(__dirname, "..", "..", "www", "instances.json"),
            "utf-8",
        ),
    ) as EC2Instance[];

    return ec2Instances.map((instance) => {
        if (
            ONLY_INSTANCES.length > 0 &&
            !ONLY_INSTANCES.includes(instance.instance_type)
        ) {
            return Promise.resolve();
        }
        return pushToWorker({
            name: instance.instance_type,
            categoryHeader: `EC2 Instances${
                instance.family ? ` (${instance.family})` : ""
            }`,
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
                    name: "vCPUs",
                    value: instance.vCPU.toString(),
                    squareIconPath: "icons/cpu-cores.png",
                },
                {
                    name: "Architecture",
                    value: instance.arch[0] || "N/A",
                    squareIconPath: "icons/cpu-arch.png",
                },
                {
                    name: "RAM",
                    value: `${instance.memory} GB`,
                    squareIconPath: "icons/ram.png",
                },
                {
                    name: "GPUs",
                    value: instance.GPU
                        ? `${instance.GPU} (${instance.GPU_memory} GB VRAM)`
                        : "0",
                    squareIconPath: "icons/gpu.png",
                },
                {
                    name: "Storage",
                    value: formatStorage(instance.storage),
                    squareIconPath: "icons/storage.png",
                },
            ],
        });
    });
}
