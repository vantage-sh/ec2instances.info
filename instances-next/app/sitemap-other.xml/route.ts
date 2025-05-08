import { urlInject } from "@/utils/urlInject";

export const dynamic = "force-static";

export async function GET() {
    const sitemap = urlInject`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${"/"}</loc>
    </url>
    <url>
        <loc>${"/rds"}</loc>
    </url>
    <url>
        <loc>${"/cache"}</loc>
    </url>
    <url>
        <loc>${"/opensearch"}</loc>
    </url>
    <url>
        <loc>${"/redshift"}</loc>
    </url>
</urlset>`;
    return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
    });
}
