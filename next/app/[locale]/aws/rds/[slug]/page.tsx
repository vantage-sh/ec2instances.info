import EC2InstanceRoot from "@/components/EC2InstanceRoot";
import { EC2Instance, Region } from "@/types";
import bestEc2InstanceForEachVariant from "@/utils/bestEc2InstanceForEachVariant";
import makeRainbowTable from "@/utils/makeRainbowTable";
import { decode } from "@msgpack/msgpack";
import { readFile } from "fs/promises";
import { Metadata } from "next";
import { urlInject } from "@/utils/urlInject";
import loadAdvertData from "@/utils/loadAdvertData";
import loadCurrencies from "@/utils/loadCurrencies";
import { SUPPORTED_LOCALES } from "@/utils/fonts";

export const dynamic = "force-static";

let p: Promise<{ regions: Region; instances: EC2Instance[] }>;

async function getData() {
    if (p) return p;
    p = (async () => {
        const regions = decode(
            await readFile("./public/instance-rds-regions.msgpack"),
        ) as Region;
        const instances = JSON.parse(
            await readFile("../www/rds/instances.json", "utf-8"),
        ) as EC2Instance[];
        for (const x of instances) {
            if ("vcpu" in x) {
                // @ts-expect-error: This is a different typed field.
                x.vCPU = x.vcpu;
                delete x.vcpu;
            }
            if ("physicalProcessor" in x) {
                // @ts-expect-error: This is a different typed field.
                x.physical_processor = x.physicalProcessor;
                delete x.physicalProcessor;
            }
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
    return SUPPORTED_LOCALES.flatMap((locale) =>
        instances.map((instance) => ({
            locale,
            slug: instance.instance_type,
        })),
    );
}

async function handleParams(params: Promise<{ slug: string }>) {
    const { slug } = await params;
    const { instances, regions } = await getData();
    const instance = instances.find((i) => i.instance_type === slug)!;
    let ondemandCost: string | undefined;
    const regionRoot =
        instance.pricing["us-east-1"] ||
        instance.pricing[Object.keys(instance.pricing)[0]];
    if (instance.instance_type.includes("mem")) {
        ondemandCost = regionRoot?.Oracle?.ondemand;
    } else if (instance.instance_type.includes("z1d")) {
        ondemandCost = regionRoot?.["SQL Server"]?.ondemand;
    } else {
        ondemandCost = regionRoot?.PostgreSQL?.ondemand;
    }
    return { instance, instances, ondemandCost, regions };
}

function generateDescription(instance: any, ondemandCost: string | undefined) {
    return `The ${instance.instance_type} instance is a ${instance.family} instance with ${instance.vCPU} vCPUs and ${instance.memory}GB of memory starting at $${ondemandCost} per hour.`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { instance, ondemandCost } = await handleParams(params);
    return {
        title: `${instance.instance_type} pricing and specs - Vantage`,
        description: generateDescription(instance, ondemandCost),
        openGraph: {
            images: [
                urlInject`${"/aws/rds/" + instance.instance_type + ".png"}`,
            ],
        },
    };
}

const reservedTermOptions: [string, string][] = [
    ["Savings.noUpfront", "No Upfront (Savings Plan)"],
    ["Standard.noUpfront", "No Upfront"],
    ["Standard.partialUpfront", "Partial Upfront"],
    ["Standard.allUpfront", "All Upfront"],
];

const osOptions: [string, string][] = [
    ["PostgreSQL", "PostgreSQL"],
    ["MySQL", "MySQL"],
    ["Oracle", "Oracle"],
    ["SQL Server", "SQL Server"],
    ["21", "Aurora Postgres & MySQL"],
    ["211", "Aurora I/O Optimized"],
    ["403", "SQL Server Enterprise"],
    ["18", "MariaDB"],
    ["20", "Oracle Standard Two"],
    ["19", "Oracle Standard Two BYOL"],
    ["4", "Oracle Standard BYOL"],
    ["410", "Oracle Enterprise BYOL"],
    ["3", "Oracle Standard One"],
    ["12", "SQL Server Standard"],
    ["10", "SQL Server Express"],
    ["210", "MySQL (Outpost On-Prem)"],
    ["220", "PostgreSQL (Outpost On-Prem)"],
    ["230", "SQL Server Enterprise (Outpost On-Prem)"],
    ["231", "SQL Server (Outpost On-Prem)"],
    ["232", "SQL Server Web (Outpost On-Prem)"],
    ["405", "SQL Server Standard BYOM"],
    ["406", "SQL Server Enterprise BYOM"],
];

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
}) {
    const { instance, instances, ondemandCost, regions } =
        await handleParams(params);

    const [db, itype] = instance.instance_type.split(".", 3);
    const variant = itype.slice(0, 2);
    const allOfVariant = instances.filter((i) =>
        i.instance_type.startsWith(`${db}.${variant}`),
    );
    const allOfInstanceType = instances
        .filter((i) => i.instance_type.startsWith(`${db}.${itype}.`))
        .map((i) => ({
            name: i.instance_type,
            cpus: i.vCPU,
            memory: i.memory || "N/A",
        }));

    const compressedInstance = makeRainbowTable([{ ...instance }]);

    const marketingData = await loadAdvertData;
    const currencies = await loadCurrencies;

    return (
        <EC2InstanceRoot
            currencies={currencies}
            rainbowTable={compressedInstance[0] as string[]}
            compressedInstance={compressedInstance[1] as EC2Instance}
            regions={regions}
            ondemandCost={ondemandCost}
            bestOfVariants={bestEc2InstanceForEachVariant(
                allOfVariant,
                instance,
                (i) => {
                    const [, itype] = i.instance_type.split(".", 3);
                    return itype;
                },
            )}
            allOfInstanceType={allOfInstanceType}
            osOptions={osOptions}
            defaultOs={
                instance.instance_type.includes("mem")
                    ? "Oracle"
                    : instance.instance_type.includes("z1d")
                      ? "SQL Server"
                      : "PostgreSQL"
            }
            generatorKey="rds"
            pathPrefix="/aws/rds"
            removeSpot={true}
            tablePath="/rds"
            storeOsNameRatherThanId={true}
            reservedTermOptions={reservedTermOptions}
            typeName="RDS"
            marketingInstanceType="rds"
            marketingData={marketingData}
        />
    );
}
