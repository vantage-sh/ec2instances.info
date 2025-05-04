import { readFile } from "fs/promises";
import { decode } from "@msgpack/msgpack";
import { Instance, Region } from "@/types";
import Client from "./Client";
import Head from "next/head";
import { PIPELINE_SIZE } from "@/utils/handleCompressedFile";

export default async function Home() {
    let data = await readFile("./public/instances-regions.msgpack");
    const regions = decode(data) as Region;

    data = await readFile("./public/first-30-instances.msgpack");
    const compressedInstances = decode(data) as [string[], ...Instance[]];

    return (
        <>
            <Head>
                {
                    Array.from({ length: PIPELINE_SIZE }).map((_, i) => (
                        <link
                            key={i}
                            rel="preload"
                            href={`/remaining-instances-p${i}.msgpack.xz`}
                            as="fetch"
                            fetchPriority="high"
                        />
                    ))
                }
            </Head>
            <Client regions={regions} compressedInstances={compressedInstances} />
        </>
    );
}
