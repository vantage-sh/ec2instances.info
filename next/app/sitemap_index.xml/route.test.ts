import { GET } from "./route";
import nextGetRouteTest from "@/utils/testing/nextGetRouteTest";
import { expect } from "vitest";
import { readdirSync, statSync } from "fs";
import { join, sep } from "path";
import { XMLParser } from "fast-xml-parser";

const sitemapInstanceRoutes = new Set<string>();
const otherSitemaps = ["/sitemap-other.xml"];

function validateSitemapIndex(xmlString: string) {
    const parser = new XMLParser();
    const sitemapIndex = parser.parse(xmlString);
    const paths = new Set<string>([...sitemapInstanceRoutes, ...otherSitemaps]);
    for (const sitemap of sitemapIndex.sitemapindex.sitemap) {
        const url = new URL(sitemap.loc);
        if (url.hostname !== "example.com") {
            throw new Error(
                `Sitemap index contains an invalid hostname: ${url.hostname}`,
            );
        }
        expect(paths.has(url.pathname)).toBe(true);
        paths.delete(url.pathname);
    }
    if (paths.size > 0) {
        throw new Error(
            `Sitemap index is missing the following paths: ${[...paths].join(", ")}`,
        );
    }
}

const root = join(__dirname, "..");

function scanFolder(path: string[]) {
    const fullPath = `${root}${sep}${path.join(sep)}`;

    const files = readdirSync(fullPath);
    for (const file of files) {
        const stat = statSync(`${fullPath}${sep}${file}`);
        if (stat.isDirectory()) {
            if (file === "sitemap-instances.xml") {
                sitemapInstanceRoutes.add(
                    `/${path.join("/")}/sitemap-instances.xml`,
                );
            } else {
                path.push(file);
                scanFolder(path);
                path.pop();
            }
        }
    }
}

scanFolder([]);

nextGetRouteTest("sitemap index is correct", GET, validateSitemapIndex, {
    NEXT_PUBLIC_URL: "http://example.com",
});
