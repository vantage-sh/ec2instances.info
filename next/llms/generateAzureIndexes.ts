import type { AzureInstance } from "@/utils/colunnData/azure";
import { urlInject } from "@/utils/urlInject";
import { raw } from "@/utils/urlInject";
import { azureInstances } from "./loadedData";

function calculatePrice(instance: AzureInstance) {
    const usEast1 = instance.pricing["us-east"];
    if (!usEast1) {
        return "N/A";
    }
    if (usEast1.linux) {
        return usEast1.linux.ondemand;
    }
    return Object.values(usEast1)[0].ondemand;
}

export const azureIndexes = [
    // RAM indexes

    {
        name: "instances under 16gb ram",
        slug: "under-16gb-ram",
        filter: (instance: AzureInstance) => instance.memory < 16,
    },
    {
        name: "instances under 32gb ram but over 16gb ram",
        slug: "under-32gb-ram-but-over-16gb-ram",
        filter: (instance: AzureInstance) =>
            instance.memory < 32 && instance.memory > 16,
    },
    {
        name: "instances under 128gb ram but over 32gb ram",
        slug: "under-128gb-ram-but-over-32gb-ram",
        filter: (instance: AzureInstance) =>
            instance.memory < 128 && instance.memory > 32,
    },
    {
        name: "instances under 256gb ram but over 128gb ram",
        slug: "under-256gb-ram-but-over-128gb-ram",
        filter: (instance: AzureInstance) =>
            instance.memory < 256 && instance.memory > 128,
    },
    {
        name: "instances under 512gb ram but over 256gb ram",
        slug: "under-512gb-ram-but-over-256gb-ram",
        filter: (instance: AzureInstance) =>
            instance.memory < 512 && instance.memory > 256,
    },
    {
        name: "instances over 512gb ram",
        slug: "over-512gb-ram",
        filter: (instance: AzureInstance) => instance.memory > 512,
    },

    // CPU indexes

    {
        name: "instances under 4 vcpu",
        slug: "under-4-vcpu",
        filter: (instance: AzureInstance) => instance.vcpu < 4,
    },
    {
        name: "instances under 8 vcpu but over 4 vcpu",
        slug: "under-8-vcpu-but-over-4-vcpu",
        filter: (instance: AzureInstance) =>
            instance.vcpu < 8 && instance.vcpu > 4,
    },
    {
        name: "instances under 16 vcpu but over 8 vcpu",
        slug: "under-16-vcpu-but-over-8-vcpu",
        filter: (instance: AzureInstance) =>
            instance.vcpu < 16 && instance.vcpu > 8,
    },
    {
        name: "instances under 32 vcpu but over 16 vcpu",
        slug: "under-32-vcpu-but-over-16-vcpu",
        filter: (instance: AzureInstance) =>
            instance.vcpu < 32 && instance.vcpu > 16,
    },
    {
        name: "instances under 64 vcpu but over 32 vcpu",
        slug: "under-64-vcpu-but-over-32-vcpu",
        filter: (instance: AzureInstance) =>
            instance.vcpu < 64 && instance.vcpu > 32,
    },
    {
        name: "instances under 128 vcpu but over 64 vcpu",
        slug: "under-128-vcpu-but-over-64-vcpu",
        filter: (instance: AzureInstance) =>
            instance.vcpu < 128 && instance.vcpu > 64,
    },
    {
        name: "instances over 128 vcpu",
        slug: "over-128-vcpu",
        filter: (instance: AzureInstance) => instance.vcpu > 128,
    },

    // Price indexes

    {
        name: "instances under $0.15/hr on demand",
        slug: "under-0.15-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) < 0.15,
    },
    {
        name: "instances more than $0.15/hr but less than $0.30/hr on demand",
        slug: "more-than-0.15-hr-but-less-than-0.30-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) > 0.15 &&
            Number(calculatePrice(instance)) < 0.3,
    },
    {
        name: "instances more than $0.30/hr but less than $0.50/hr on demand",
        slug: "more-than-0.30-hr-but-less-than-0.50-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) > 0.3 &&
            Number(calculatePrice(instance)) < 0.5,
    },
    {
        name: "instances more than $0.50/hr but less than $1/hr on demand",
        slug: "more-than-0.50-hr-but-less-than-1-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) > 0.5 &&
            Number(calculatePrice(instance)) < 1,
    },
    {
        name: "instances more than $1/hr but less than $2/hr on demand",
        slug: "more-than-1-hr-but-less-than-2-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) > 1 &&
            Number(calculatePrice(instance)) < 2,
    },
    {
        name: "instances more than $2/hr but less than $3/hr on demand",
        slug: "more-than-2-hr-but-less-than-3-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) > 2 &&
            Number(calculatePrice(instance)) < 3,
    },
    {
        name: "instances more than $3/hr but less than $4/hr on demand",
        slug: "more-than-3-hr-but-less-than-4-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) > 3 &&
            Number(calculatePrice(instance)) < 4,
    },
    {
        name: "instances more than $4/hr but less than $8/hr on demand",
        slug: "more-than-4-hr-but-less-than-8-hr-on-demand",
        filter: (instance: AzureInstance) =>
            Number(calculatePrice(instance)) > 4 &&
            Number(calculatePrice(instance)) < 8,
    },
    {
        name: "instances more than $8/hr on demand",
        slug: "more-than-8-hr-on-demand",
        filter: (instance: AzureInstance) => Number(calculatePrice(instance)) > 8,
    },
];

export function generateIndexMarkdown(pathPrefix: string, name: string, instances: AzureInstance[]) {
    return `# ${name}

${instances
    .map(
        (
            i,
        ) => urlInject`- **${raw(i.instance_type)} (min $${raw(String(calculatePrice(i)))}/hr on demand)**
    - [HTML (with user UI)](${`${pathPrefix}/${i.instance_type}`})
    - [Markdown (with pricing data region indexes)](${`${pathPrefix}/${i.instance_type}.md`})`,
    )
    .join("\n")}
`;
}

export async function generateAzureIndexes(pathPrefix: string) {
    const instances = await azureInstances;
    const buckets = new Map<string, AzureInstance[]>();
    for (const instance of instances) {
        for (const index of azureIndexes) {
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
            azureIndexes.find((i) => i.slug === slug)!.name,
            instances,
        );
        markdownFiles.set(slug, markdown);
    }
    return markdownFiles;
}
