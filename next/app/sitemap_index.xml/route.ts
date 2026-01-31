import { urlInject } from "@/utils/urlInject";
import { SUPPORTED_LOCALES } from "@/utils/localeConstants";

export const dynamic = "force-static";

export async function GET() {
    const localeSitemaps = SUPPORTED_LOCALES.flatMap((locale) => [
        `    <sitemap>
        <loc>${urlInject`${`/${locale}/aws/ec2/sitemap-instances.xml`}`}</loc>
    </sitemap>`,
        `    <sitemap>
        <loc>${urlInject`${`/${locale}/aws/rds/sitemap-instances.xml`}`}</loc>
    </sitemap>`,
        `    <sitemap>
        <loc>${urlInject`${`/${locale}/aws/elasticache/sitemap-instances.xml`}`}</loc>
    </sitemap>`,
        `    <sitemap>
        <loc>${urlInject`${`/${locale}/aws/redshift/sitemap-instances.xml`}`}</loc>
    </sitemap>`,
        `    <sitemap>
        <loc>${urlInject`${`/${locale}/aws/opensearch/sitemap-instances.xml`}`}</loc>
    </sitemap>`,
        `    <sitemap>
        <loc>${urlInject`${`/${locale}/azure/vm/sitemap-instances.xml`}`}</loc>
    </sitemap>`,
        `    <sitemap>
        <loc>${urlInject`${`/${locale}/gcp/sitemap-instances.xml`}`}</loc>
    </sitemap>`,
    ]);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${localeSitemaps.join("\n")}
    <sitemap>
        <loc>${urlInject`${"/sitemap-other.xml"}`}</loc>
    </sitemap>
</sitemapindex>`;
    return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
    });
}
