import { readFile } from "fs/promises";
import { decode } from "@msgpack/msgpack";
import { EC2Instance, Region } from "@/types";
import AWSClient from "./AWSClient";
import Head from "next/head";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";

export default async function Home() {
    let data = await readFile("./public/instances-regions.msgpack");
    const regions = decode(data) as Region;

    data = await readFile("./public/first-30-instances.msgpack");
    const compressedInstances = decode(data) as [string[], ...EC2Instance[]];

    const instanceCount = Number(await readFile("./public/instance-count.txt"));
    const instancesHash = await readFile("./public/instances-hash.txt", "utf-8");

    return (
        <>
            <Head>
                {
                    Array.from({ length: PIPELINE_SIZE }).map((_, i) => (
                        <link
                            key={i}
                            rel="preload"
                            href={`/remaining-instances-p${i}.msgpack.xz?cache=${instancesHash}`}
                            as="fetch"
                            fetchPriority="high"
                        />
                    ))
                }
            </Head>
            <AWSClient
                instanceCount={instanceCount}
                regions={regions}
                compressedInstances={compressedInstances}
                compressedDataPathTemplate={`/remaining-instances-p{}.msgpack.xz?cache=${instancesHash}`}
                columnAtomKey="ec2"
            />
        </>
    );
}
