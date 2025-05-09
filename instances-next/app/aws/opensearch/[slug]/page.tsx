import { readFile } from "fs/promises";
import { Region } from "@/types";
import type { Instance } from "@/utils/colunnData/opensearch";
import HalfEC2Root from "@/components/HalfEC2Root";
import InstanceDataView from "@/components/InstanceDataView";
import generateOpensearchTables from "@/utils/generateOpensearchTables";

export const dynamic = "force-static";

let p: Promise<{ regions: Region; instances: Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const instances = JSON.parse(
            await readFile("../www/opensearch/instances.json", "utf8"),
        );
        const regions: Region = {
            main: {},
            local_zone: {},
            wavelength: {},
        };
        for (const instance of instances) {
            for (const r in instance.pricing) {
                if (r.includes("wl1") || r.includes("wl2")) {
                    regions.wavelength[r] = instance.regions[r];
                } else if (/\d+/.test(r)) {
                    regions.local_zone[r] = instance.regions[r];
                } else {
                    regions.main[r] = instance.regions[r];
                }
            }
        }

        return {
            regions,
            instances: instances as Instance[],
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
    const instance = instances.find((i) => i.instance_type === slug)!;
    const ondemandCost = instance.pricing["us-east-1"]?.ondemand;
    return { instance, instances, ondemandCost, regions };
}

function generateDescription(instance: Instance, ondemandCost: string) {
    return `The ${instance.instance_type} instance is in the ${instance.family} family and it has ${instance.vcpu} vCPUs, ${instance.memory} GiB of memory starting at $${ondemandCost} per hour.`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, ondemandCost } = await handleParams(params);
    return {
        title: `${instance.instance_type} pricing and specs - Vantage`,
        description: generateDescription(instance, ondemandCost),
    };
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { instance, instances, ondemandCost, regions } =
        await handleParams(params);
    const description = generateDescription(instance, ondemandCost);

    const [itype] = instance.instance_type.split(".", 2);
    const allOfInstanceType = instances
        .filter((i) => i.instance_type.startsWith(`${itype}.`))
        .map((i) => ({
            name: i.instance_type,
            cpus: Number(i.vcpu),
            memory: i.memory || "N/A",
        }));

    return (
        <HalfEC2Root
            allOfInstanceType={allOfInstanceType}
            instance={instance}
            description={description}
            pathPrefix="/aws/opensearch"
            tablePath="/opensearch"
            regions={regions}
        >
            <InstanceDataView tables={generateOpensearchTables(instance)} />
        </HalfEC2Root>
    );
}
