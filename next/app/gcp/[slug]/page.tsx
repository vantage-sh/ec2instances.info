import { GCPInstance } from "@/utils/colunnData/gcp";
import { readFile } from "fs/promises";
import { Metadata } from "next";
import { urlInject } from "@/utils/urlInject";
import { Region } from "@/types";
import { notFound } from "next/navigation";

export const dynamic = "force-static";

let p: Promise<{ regions: Record<string, string>; instances: GCPInstance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = JSON.parse(
            await readFile("./public/gcp-regions.json", "utf-8"),
        ) as Region;
        const instances = JSON.parse(
            await readFile("../www/gcp/instances.json", "utf8"),
        ) as GCPInstance[];
        return {
            regions: regions.main,
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

async function handleParams(params: Promise<{ slug: string }>) {
    const { slug } = await params;
    const { instances, regions } = await getData();
    const instance = instances.find(
        (instance) => instance.instance_type === slug,
    );

    if (!instance) {
        notFound();
    }

    const description = `${instance.pretty_name} features and pricing. ${instance.vCPU} vCPUs, ${instance.memory} GiB memory. Compare with other GCP Compute Engine instances.`;

    return {
        instance,
        instances,
        regions,
        description,
    };
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { description, instance } = await handleParams(params);
    return {
        title: `${instance.pretty_name} pricing and specs - Vantage`,
        description,
        openGraph: {
            images: [urlInject`${"/gcp/" + instance.instance_type + ".png"}`],
        },
    };
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance } = await handleParams(params);

    // For now, redirect to the main GCP page
    // TODO: Create a full GCPInstanceRoot component similar to Azure/EC2
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">{instance.pretty_name}</h1>
            <div className="space-y-4">
                <div>
                    <strong>Instance Type:</strong> {instance.instance_type}
                </div>
                <div>
                    <strong>vCPUs:</strong> {instance.vCPU}
                </div>
                <div>
                    <strong>Memory:</strong> {instance.memory} GiB
                </div>
                <div>
                    <strong>Family:</strong> {instance.family}
                </div>
                {instance.GPU > 0 && (
                    <div>
                        <strong>GPUs:</strong> {instance.GPU}
                    </div>
                )}
                <div className="mt-6">
                    <a href="/gcp" className="text-blue-600 hover:underline">
                        ← Back to all GCP instances
                    </a>
                </div>
            </div>
        </div>
    );
}
