import { EC2Instance } from "@/types";
import { urlInject, raw } from "@/utils/urlInject";

export function calculatePrice(instance: EC2Instance) {
    const usEast1 = instance.pricing["us-east-1"];
    if (!usEast1) {
        return "N/A";
    }
    if (usEast1.linux) {
        return usEast1.linux.ondemand;
    }
    return Object.values(usEast1)[0].ondemand;
}

export const awsIndexes = [
    // RAM indexes

    {
        name: "instances under 16gb ram",
        slug: "under-16gb-ram",
        filter: (instance: EC2Instance) => instance.memory < 16,
    },
    {
        name: "instances under 32gb ram but over 16gb ram",
        slug: "under-32gb-ram-but-over-16gb-ram",
        filter: (instance: EC2Instance) =>
            instance.memory < 32 && instance.memory > 16,
    },
    {
        name: "instances under 128gb ram but over 32gb ram",
        slug: "under-128gb-ram-but-over-32gb-ram",
        filter: (instance: EC2Instance) =>
            instance.memory < 128 && instance.memory > 32,
    },
    {
        name: "instances under 256gb ram but over 128gb ram",
        slug: "under-256gb-ram-but-over-128gb-ram",
        filter: (instance: EC2Instance) =>
            instance.memory < 256 && instance.memory > 128,
    },
    {
        name: "instances under 512gb ram but over 256gb ram",
        slug: "under-512gb-ram-but-over-256gb-ram",
        filter: (instance: EC2Instance) =>
            instance.memory < 512 && instance.memory > 256,
    },
    {
        name: "instances over 512gb ram",
        slug: "over-512gb-ram",
        filter: (instance: EC2Instance) => instance.memory > 512,
    },

    // CPU indexes

    {
        name: "instances under 4 vcpu",
        slug: "under-4-vcpu",
        filter: (instance: EC2Instance) => instance.vCPU < 4,
    },
    {
        name: "instances under 8 vcpu but over 4 vcpu",
        slug: "under-8-vcpu-but-over-4-vcpu",
        filter: (instance: EC2Instance) =>
            instance.vCPU < 8 && instance.vCPU > 4,
    },
    {
        name: "instances under 16 vcpu but over 8 vcpu",
        slug: "under-16-vcpu-but-over-8-vcpu",
        filter: (instance: EC2Instance) =>
            instance.vCPU < 16 && instance.vCPU > 8,
    },
    {
        name: "instances under 32 vcpu but over 16 vcpu",
        slug: "under-32-vcpu-but-over-16-vcpu",
        filter: (instance: EC2Instance) =>
            instance.vCPU < 32 && instance.vCPU > 16,
    },
    {
        name: "instances under 64 vcpu but over 32 vcpu",
        slug: "under-64-vcpu-but-over-32-vcpu",
        filter: (instance: EC2Instance) =>
            instance.vCPU < 64 && instance.vCPU > 32,
    },
    {
        name: "instances under 128 vcpu but over 64 vcpu",
        slug: "under-128-vcpu-but-over-64-vcpu",
        filter: (instance: EC2Instance) =>
            instance.vCPU < 128 && instance.vCPU > 64,
    },
    {
        name: "instances over 128 vcpu",
        slug: "over-128-vcpu",
        filter: (instance: EC2Instance) => instance.vCPU > 128,
    },

    // Price indexes

    {
        name: "instances under $0.15/hr on demand",
        slug: "under-0.15-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) < 0.15,
    },
    {
        name: "instances more than $0.15/hr but less than $0.30/hr on demand",
        slug: "more-than-0.15-hr-but-less-than-0.30-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) > 0.15 &&
            Number(calculatePrice(instance)) < 0.3,
    },
    {
        name: "instances more than $0.30/hr but less than $0.50/hr on demand",
        slug: "more-than-0.30-hr-but-less-than-0.50-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) > 0.3 &&
            Number(calculatePrice(instance)) < 0.5,
    },
    {
        name: "instances more than $0.50/hr but less than $1/hr on demand",
        slug: "more-than-0.50-hr-but-less-than-1-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) > 0.5 &&
            Number(calculatePrice(instance)) < 1,
    },
    {
        name: "instances more than $1/hr but less than $2/hr on demand",
        slug: "more-than-1-hr-but-less-than-2-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) > 1 &&
            Number(calculatePrice(instance)) < 2,
    },
    {
        name: "instances more than $2/hr but less than $3/hr on demand",
        slug: "more-than-2-hr-but-less-than-3-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) > 2 &&
            Number(calculatePrice(instance)) < 3,
    },
    {
        name: "instances more than $3/hr but less than $4/hr on demand",
        slug: "more-than-3-hr-but-less-than-4-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) > 3 &&
            Number(calculatePrice(instance)) < 4,
    },
    {
        name: "instances more than $4/hr but less than $8/hr on demand",
        slug: "more-than-4-hr-but-less-than-8-hr-on-demand",
        filter: (instance: EC2Instance) =>
            Number(calculatePrice(instance)) > 4 &&
            Number(calculatePrice(instance)) < 8,
    },
    {
        name: "instances more than $8/hr on demand",
        slug: "more-than-8-hr-on-demand",
        filter: (instance: EC2Instance) => Number(calculatePrice(instance)) > 8,
    },
];

export function generateIndexMarkdown(pathPrefix: string, name: string, instances: EC2Instance[]) {
    return `# ${name}

${instances
    .map(
        (
            i,
        ) => urlInject`- **${raw(i.instance_type)} (min $${raw(calculatePrice(i))}/hr on demand)**
    - [HTML (with user UI)](${`${pathPrefix}/${i.instance_type}`})
    - [Markdown (with pricing data region indexes)](${`${pathPrefix}/${i.instance_type}.md`})`,
    )
    .join("\n")}
`;
}

export async function generateAwsIndexes(pathPrefix: string, instancesPromise: Promise<EC2Instance[]>) {
    const instances = await instancesPromise;
    const buckets = new Map<string, EC2Instance[]>();
    for (const instance of instances) {
        for (const index of awsIndexes) {
            if (index.filter(instance)) {
                const bucket = buckets.get(index.slug) || [];
                bucket.push(instance);
                buckets.set(index.slug, bucket);
            }
        }
    }

    const markdownFiles = new Map<string, string>();
    for (const [slug, instances] of buckets.entries()) {
        const markdown = generateIndexMarkdown(
            pathPrefix,
            awsIndexes.find((i) => i.slug === slug)!.name,
            instances,
        );
        markdownFiles.set(slug, markdown);
    }
    return markdownFiles;
}
