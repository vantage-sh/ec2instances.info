"use client";

import { urlInject } from "@/utils/urlInject";
import { usePathname } from "next/navigation";
import Head from "next/head";

export default function OpengraphImageInjector() {
    const path = usePathname();

    return (
        <Head>
            <meta property="og:image" content={urlInject`${path + ".png"}`} />
            <meta property="og:image:type" content="image/png" />
        </Head>
    );
}
