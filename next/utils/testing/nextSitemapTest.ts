import nextGetRouteTest from "./nextGetRouteTest";
import { XMLParser } from "fast-xml-parser";

export default function nextSitemapTest(
    getMethod: (req: Request) => Promise<Response>,
    paths: string[],
) {
    nextGetRouteTest(
        "sitemap is correct",
        getMethod,
        (xmlString) => {
            const pathsSet = new Set(paths);
            const parser = new XMLParser();
            const sitemap = parser.parse(xmlString);
            for (const urlString of sitemap.urlset.url) {
                const url = new URL(urlString.loc);
                if (url.hostname !== "example.com") {
                    throw new Error(
                        `Sitemap contains an invalid hostname: ${url.hostname}`,
                    );
                }
                if (!pathsSet.delete(url.pathname)) {
                    throw new Error(
                        `Sitemap contains an invalid path: ${url.pathname}`,
                    );
                }
            }
            if (pathsSet.size > 0) {
                throw new Error(
                    `Sitemap is missing the following paths: ${[...pathsSet].join(", ")}`,
                );
            }
        },
        {
            NEXT_PUBLIC_URL: "http://example.com",
        },
    );
}
