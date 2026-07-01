import { urlInject } from "@/utils/urlInject";
import { SUPPORTED_LOCALES } from "@/utils/localeConstants";

export const dynamic = "force-static";

const SECTION_PATHS = ["/", "/azure", "/gcp", "/rds", "/cache", "/opensearch", "/redshift"];

export async function GET() {
    const urlEntries = SUPPORTED_LOCALES.flatMap((locale) =>
        SECTION_PATHS.map((path) => {
            const localePath = path === "/" ? `/${locale}` : `/${locale}${path}`;
            const loc = urlInject`${localePath}`;
            return `    <url>
        <loc>${loc}</loc>
    </url>`;
        }),
    );

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;
    return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
    });
}
