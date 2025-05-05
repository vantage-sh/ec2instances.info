import urlInject from "@/utils/urlInject";

export const dynamic = "force-static";

export async function GET() {
    const sitemap = urlInject`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${"/aws/ec2/sitemap-instances.xml"}</loc>
    </sitemap>
    <sitemap>
        <loc>${"/sitemap-other.xml"}</loc>
    </sitemap>
</sitemapindex>`;
    return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
}
