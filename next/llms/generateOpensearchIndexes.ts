import { urlInject, raw } from "@/utils/urlInject";
import { Instance } from "@/utils/colunnData/opensearch";

export function calculatePrice(instance: Instance) {
    const usEast1 = instance.pricing["us-east-1"];
    if (!usEast1) {
        return "N/A";
    }
    return usEast1.ondemand;
}

export const opensearchIndexes = [
    // RAM indexes

    {
        name: "instances under 32gb ram",
        slug: "under-32gb-ram",
        filter: (instance: Instance) => Number(instance.memory) < 32,
    },
    {
        name: "instances over 32gb ram",
        slug: "over-32gb-ram",
        filter: (instance: Instance) => Number(instance.memory) > 32,
    },

    // CPU indexes

    {
        name: "instances under 8 vcpu",
        slug: "under-8-vcpu",
        filter: (instance: Instance) => Number(instance.vcpu) < 8,
    },
    {
        name: "instances over 8 vcpu",
        slug: "over-8-vcpu",
        filter: (instance: Instance) => Number(instance.vcpu) > 8,
    },

    // Price indexes

    {
        name: "instances under $0.80/hr on demand",
        slug: "under-0.80-hr-on-demand",
        filter: (instance: Instance) => Number(calculatePrice(instance)) < 0.8,
    },
    {
        name: "instances over $0.80/hr on demand",
        slug: "over-0.80-hr-on-demand",
        filter: (instance: Instance) => Number(calculatePrice(instance)) > 0.8,
    },
];

export function generateIndexMarkdown(name: string, instances: Instance[]) {
    return `# ${name}

${instances
    .map(
        (
            i,
        ) => urlInject`- **${raw(i.instance_type)} (min $${raw(calculatePrice(i))}/hr on demand)**
    - [HTML (with user UI)](${`/aws/opensearch/${i.instance_type}`})
    - [Markdown (with pricing data region indexes)](${`/aws/opensearch/${i.instance_type}.md`})`,
    )
    .join("\n")}
`;
}

export async function generateOpensearchIndexes(instancesPromise: Promise<Instance[]>) {
    const instances = await instancesPromise;
    const buckets = new Map<string, Instance[]>();
    for (const instance of instances) {
        for (const index of opensearchIndexes) {
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
            opensearchIndexes.find((i) => i.slug === slug)!.name,
            instances,
        );
        markdownFiles.set(slug, markdown);
    }
    return markdownFiles;
}
