import Filters from "@/components/Filters";
import { readFile } from "fs/promises";
import { decode } from "@msgpack/msgpack";
import { Instance, Region } from "@/types";
import Client from "./Client";
import Head from "next/head";

export default async function Home() {
    let data = await readFile("./public/instances-regions.msgpack");
    const regions = decode(data) as Region;

    data = await readFile("./public/first-30-instances.msgpack");
    const first30Instances = decode(data) as Instance[];

    return (
        <>
            <Head>
                <link rel="preload" href="/remaining-instances.msgpack.xz" as="fetch" fetchPriority="high" />
            </Head>
            <Client regions={regions} first30Instances={first30Instances} />
        </>
    );
}
