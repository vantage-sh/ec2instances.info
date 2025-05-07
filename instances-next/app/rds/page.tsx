import { readFile } from "fs/promises";
import { decode } from "@msgpack/msgpack";
import { EC2Instance, Region } from "@/types";
import AWSClient from "../AWSClient";
import Head from "next/head";

export default async function RDS() {
    let data = await readFile("./public/instance-rds-regions.msgpack");
    const regions = decode(data) as Region;

    data = await readFile("./public/first-30-rds-instances.msgpack");
    const compressedInstances = decode(data) as [string[], ...EC2Instance[]];

    const instanceCount = Number(await readFile("./public/instance-rds-count.txt"));
    const instancesHash = await readFile("./public/instance-rds-hash.txt", "utf-8");

    return (
        <>
            <Head>
                <link rel="preload" href={`/remaining-rds-instances.msgpack.xz?cache=${instancesHash}`} as="fetch" fetchPriority="high" />
            </Head>
            <AWSClient
                instanceCount={instanceCount}
                regions={regions}
                compressedInstances={compressedInstances}
                compressedDataPathTemplate={`/remaining-rds-instances.msgpack.xz?cache=${instancesHash}`}
                columnAtomKey="rds"
            />
        </>
    );
}
