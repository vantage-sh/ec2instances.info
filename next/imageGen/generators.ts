import { readFileSync } from "fs";
import path from "path";
import type { EC2Instance } from "../types";
import { pushToWorker } from "./shared";
import { urlInject } from "@/utils/urlInject";

const ONLY_INSTANCES = process.env.ONLY_INSTANCES?.split(",") || [];

function formatStorage(storage: EC2Instance["storage"] | undefined) {
    if (!storage) {
        return "EBS only";
    }
    return `${storage.size} ${storage.size_unit}`;
}

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
            url: urlInject`${`/aws/ec2/${instance.instance_type}`}`,
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

export function generateRdsImages() {
    const rdsInstances = JSON.parse(
        readFileSync(
            path.join(__dirname, "..", "..", "www", "rds", "instances.json"),
            "utf-8",
        ),
    ) as {
        instance_type: string;
        vcpu: number;
        memory: number;
        storage?: string;
        family?: string;
        arch?: string;
    }[];

    return rdsInstances.map((instance) => {
        if (
            ONLY_INSTANCES.length > 0 &&
            !ONLY_INSTANCES.includes(instance.instance_type)
        ) {
            return Promise.resolve();
        }

        const arch = instance.arch
            ? [
                  {
                      name: "Architecture",
                      value: instance.arch,
                      squareIconPath: "icons/cpu-arch.png",
                  },
              ]
            : [];

        return pushToWorker({
            name: instance.instance_type,
            categoryHeader: `RDS Instances${
                instance.family ? ` (${instance.family})` : ""
            }`,
            filename: path.join(
                __dirname,
                "..",
                "public",
                "aws",
                "rds",
                `${instance.instance_type}.png`,
            ),
            url: urlInject`${`/aws/rds/${instance.instance_type}`}`,
            values: [
                {
                    name: "vCPUs",
                    value: instance.vcpu.toString(),
                    squareIconPath: "icons/cpu-cores.png",
                },
                ...arch,
                {
                    name: "RAM",
                    value: `${instance.memory} GB`,
                    squareIconPath: "icons/ram.png",
                },
                {
                    name: "Storage",
                    value: instance.storage
                        ? `${instance.storage} GB`
                        : "EBS only",
                    squareIconPath: "icons/storage.png",
                },
            ],
        });
    });
}

export function generateElasticacheImages() {
    const elasticacheInstances = JSON.parse(
        readFileSync(
            path.join(__dirname, "..", "..", "www", "cache", "instances.json"),
            "utf-8",
        ),
    ) as {
        instance_type: string;
        vcpu: number;
        memory: number;
        family: string;
        network_performance: string;
    }[];

    return elasticacheInstances.map((instance) => {
        if (
            ONLY_INSTANCES.length > 0 &&
            !ONLY_INSTANCES.includes(instance.instance_type)
        ) {
            return Promise.resolve();
        }
        return pushToWorker({
            name: instance.instance_type,
            categoryHeader: `ElastiCache Instances${
                instance.family ? ` (${instance.family})` : ""
            }`,
            filename: path.join(
                __dirname,
                "..",
                "public",
                "aws",
                "elasticache",
                `${instance.instance_type}.png`,
            ),
            url: urlInject`${`/aws/elasticache/${instance.instance_type}`}`,
            values: [
                {
                    name: "vCPUs",
                    value: instance.vcpu.toString(),
                    squareIconPath: "icons/cpu-cores.png",
                },
                {
                    name: "RAM",
                    value: `${instance.memory} GB`,
                    squareIconPath: "icons/ram.png",
                },
                {
                    name: "Networking",
                    value: instance.network_performance,
                    squareIconPath: "icons/storage.png",
                },
            ],
        });
    });
}

export function generateRedshiftImages() {
    const redshiftInstances = JSON.parse(
        readFileSync(
            path.join(
                __dirname,
                "..",
                "..",
                "www",
                "redshift",
                "instances.json",
            ),
            "utf-8",
        ),
    ) as {
        instance_type: string;
        family: string;
        vcpu: number;
        memory: number;
        storage: string;
        ecu: string;
        io: string;
    }[];

    return redshiftInstances.map((instance) => {
        if (
            ONLY_INSTANCES.length > 0 &&
            !ONLY_INSTANCES.includes(instance.instance_type)
        ) {
            return Promise.resolve();
        }
        return pushToWorker({
            name: instance.instance_type,
            categoryHeader: `Redshift Instances${
                instance.family ? ` (${instance.family})` : ""
            }`,
            filename: path.join(
                __dirname,
                "..",
                "public",
                "aws",
                "redshift",
                `${instance.instance_type}.png`,
            ),
            url: urlInject`${`/aws/redshift/${instance.instance_type}`}`,
            values: [
                {
                    name: "vCPUs",
                    value: instance.vcpu.toString(),
                    squareIconPath: "icons/cpu-cores.png",
                },
                {
                    name: "RAM",
                    value: `${instance.memory} GB`,
                    squareIconPath: "icons/ram.png",
                },
                {
                    name: "Storage",
                    value: instance.storage || "EBS only",
                    squareIconPath: "icons/storage.png",
                },
                {
                    name: "ECUs",
                    value: instance.ecu || "Variable",
                    squareIconPath: "icons/cpu-arch.png",
                },
                {
                    name: "IO",
                    value: instance.io || "N/A",
                    squareIconPath: "icons/gpu.png",
                },
            ],
        });
    });
}

export function generateOpensearchImages() {
    const opensearchInstances = JSON.parse(
        readFileSync(
            path.join(
                __dirname,
                "..",
                "..",
                "www",
                "opensearch",
                "instances.json",
            ),
            "utf-8",
        ),
    ) as {
        instance_type: string;
        family: string;
        vcpu: number;
        memory: number;
        ecu: string;
        storage: string;
    }[];

    return opensearchInstances.map((instance) => {
        if (
            ONLY_INSTANCES.length > 0 &&
            !ONLY_INSTANCES.includes(instance.instance_type)
        ) {
            return Promise.resolve();
        }
        return pushToWorker({
            name: instance.instance_type,
            categoryHeader: `OpenSearch Instances${
                instance.family ? ` (${instance.family})` : ""
            }`,
            filename: path.join(
                __dirname,
                "..",
                "public",
                "aws",
                "opensearch",
                `${instance.instance_type}.png`,
            ),
            url: urlInject`${`/aws/opensearch/${instance.instance_type}`}`,
            values: [
                {
                    name: "vCPUs",
                    value: instance.vcpu.toString(),
                    squareIconPath: "icons/cpu-cores.png",
                },
                {
                    name: "RAM",
                    value: `${instance.memory} GB`,
                    squareIconPath: "icons/ram.png",
                },
                {
                    name: "ECUs",
                    value: instance.ecu || "Variable",
                    squareIconPath: "icons/cpu-arch.png",
                },
                {
                    name: "Storage",
                    value: instance.storage || "EBS only",
                    squareIconPath: "icons/storage.png",
                },
            ],
        });
    });
}

export function generateAzureImages() {
    const azureInstances = JSON.parse(
        readFileSync(
            path.join(__dirname, "..", "..", "www", "azure", "instances.json"),
            "utf-8",
        ),
    ) as {
        instance_type: string;
        pretty_name_azure: string;
        family: string;
        vcpu: number;
        memory: number;
        size: number;
        GPU: string;
    }[];

    return azureInstances.map((instance) => {
        if (
            ONLY_INSTANCES.length > 0 &&
            !ONLY_INSTANCES.includes(instance.instance_type)
        ) {
            return Promise.resolve();
        }
        return pushToWorker({
            name: instance.pretty_name_azure,
            categoryHeader: "Azure Instances",
            filename: path.join(
                __dirname,
                "..",
                "public",
                "azure",
                "vm",
                `${instance.instance_type}.png`,
            ),
            url: urlInject`${`/azure/vm/${instance.instance_type}`}`,
            values: [
                {
                    name: "vCPUs",
                    value: instance.vcpu.toString(),
                    squareIconPath: "icons/cpu-cores.png",
                },
                {
                    name: "RAM",
                    value: `${instance.memory} GB`,
                    squareIconPath: "icons/ram.png",
                },
                {
                    name: "Storage",
                    value: `${instance.size || 0} GB`,
                    squareIconPath: "icons/storage.png",
                },
                {
                    name: "GPUs",
                    value: instance.GPU || "0",
                    squareIconPath: "icons/gpu.png",
                },
            ],
        });
    });
}

export function generateGcpImages() {
    const gcpInstances = JSON.parse(
        readFileSync(
            path.join(__dirname, "..", "..", "www", "gcp", "instances.json"),
            "utf-8",
        ),
    ) as {
        instance_type: string;
        pretty_name: string;
        family: string;
        vCPU: number;
        memory: number;
        GPU: number;
        GPU_memory?: number;
        local_ssd: boolean;
        local_ssd_size?: number;
        shared_cpu: boolean;
    }[];

    return gcpInstances.map((instance) => {
        if (
            ONLY_INSTANCES.length > 0 &&
            !ONLY_INSTANCES.includes(instance.instance_type)
        ) {
            return Promise.resolve();
        }
        return pushToWorker({
            name: instance.pretty_name,
            categoryHeader: `GCP Instances${
                instance.family ? ` (${instance.family})` : ""
            }`,
            filename: path.join(
                __dirname,
                "..",
                "public",
                "gcp",
                `${instance.instance_type}.png`,
            ),
            url: urlInject`${`/gcp/${instance.instance_type}`}`,
            values: [
                {
                    name: "vCPUs",
                    value: instance.vCPU.toString(),
                    squareIconPath: "icons/cpu-cores.png",
                },
                {
                    name: "RAM",
                    value: `${instance.memory} GB`,
                    squareIconPath: "icons/ram.png",
                },
                {
                    name: "GPUs",
                    value: instance.GPU
                        ? `${instance.GPU} (${instance.GPU_memory || 0} GB)`
                        : "0",
                    squareIconPath: "icons/gpu.png",
                },
                {
                    name: "Local SSD",
                    value: instance.local_ssd
                        ? `${instance.local_ssd_size || 0} GB`
                        : "No",
                    squareIconPath: "icons/storage.png",
                },
                {
                    name: "Shared CPU",
                    value: instance.shared_cpu ? "Yes" : "No",
                    squareIconPath: "icons/cpu-arch.png",
                },
            ],
        });
    });
}
