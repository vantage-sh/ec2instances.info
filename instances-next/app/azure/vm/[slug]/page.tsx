import { AzureInstance } from "@/utils/colunnData/azure";
import { load } from "js-yaml";
import { readFile } from "fs/promises";
import formatAzureInstanceType from "@/utils/formatAzureInstanceType";

export const dynamic = "force-static";

let p: Promise<{ regions: Record<string, string>; instances: AzureInstance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = load(
            await readFile("../meta/regions_azure2.yaml", "utf8"),
        ) as Record<string, string>;
        const instances = JSON.parse(
            await readFile("../www/azure/instances.json", "utf8"),
        ) as AzureInstance[];
        for (const instance of instances) {
            formatAzureInstanceType(instance);
        }
        return {
            regions,
            instances,
        };
    })();
    return p;
}

export async function generateStaticParams() {
    const { instances } = await getData();
    return instances.map((instance) => ({
        slug: instance.instance_type,
    }));
}

function titleCase(str: string) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

async function handleParams(params: Promise<{ slug: string }>) {
    const { slug } = await params;
    const { instances, regions } = await getData();
    const instance = instances.find((instance) => instance.instance_type === slug)!;

    let region = instance.pricing["us-east"];
    if (!region) {
        region = instance.pricing[Object.keys(instance.pricing)[0]];
    }
    let platform = region.linux;
    if (!platform) {
        platform = region.windows;
        if (!platform) {
            platform = region[Object.keys(region)[0]];
        }
    }
    if (!platform) {
        throw new Error(`No platform found for ${slug}`);
    }

    const onDemand = platform.ondemand;
    const spot = platform.spot_min;

    let spotText = "";
    if (spot) {
        spotText = ` or $${spot} per hour with spot instances`;
    }
    const description = `The ${instance.pretty_name_azure} is in the ${titleCase(instance.family)} series with ${instance.vcpu} vCPUs and ${instance.memory} GiB of memory starting at $${onDemand} per hour on-demand${spotText}.`;

    return {
        instance,
        instances,
        regions,
        description,
    };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { description, instance } = await handleParams(params);
    return {
        title: `${instance.pretty_name} pricing and specs - Vantage`,
        description,
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { instance, regions, description } = await handleParams(params);
    return null;
}
