import { urlInject, raw } from "@/utils/urlInject";
import { Instance } from "@/utils/colunnData/sagemaker";

export function calculatePrice(instance: Instance) {
    const usEast1 = instance.pricing["us-east-1"];
    if (!usEast1) {
        return "N/A";
    }
    return usEast1.ondemand;
}

export const sagemakerIndexes = [
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
    {
        name: "instances under 8 vcpu",
        slug: "under-8-vcpu",
        filter: (instance: Instance) => Number(instance.vCPU) < 8,
    },
    {
        name: "instances over 8 vcpu",
        slug: "over-8-vcpu",
        filter: (instance: Instance) => Number(instance.vCPU) > 8,
    },
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
    - [HTML (with user UI)](${`/aws/sagemaker/${i.instance_type}`})
    - [Markdown (with pricing data region indexes)](${`/aws/sagemaker/${i.instance_type}.md`})`,
    )
    .join("\n")}
`;
}

export async function generateSageMakerIndexes(
    instancesPromise: Promise<Instance[]>,
) {
    const instances = await instancesPromise;
    const markdownFiles = new Map<string, string>();
    for (const index of sagemakerIndexes) {
        const bucket = instances.filter(index.filter);
        if (bucket.length === 0) continue;
        markdownFiles.set(
            index.slug,
            generateIndexMarkdown(index.name, bucket),
        );
    }
    return markdownFiles;
}
