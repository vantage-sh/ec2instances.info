import { urlInject } from "@/utils/urlInject";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/utils/localeConstants";

export const dynamic = "force-static";

const SECTION_PATHS = ["/", "/azure", "/gcp", "/rds", "/cache", "/opensearch", "/redshift"];

export async function GET() {
    const urlEntries = SUPPORTED_LOCALES.flatMap((locale) =>
        SECTION_PATHS.map((path) => {
            const localePath = path === "/" ? `/${locale}` : `/${locale}${path}`;
            const defaultPath = path === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${path}`;
            const loc = urlInject`${localePath}`;
            const xdefault = urlInject`${defaultPath}`;
            return `    <url>
        <loc>${loc}</loc>
        <xhtml:link rel="alternate" hreflang="${locale}" href="${loc}"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="${xdefault}"/>
    </url>`;
        }),
    );

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join("\n")}
</urlset>`;
    return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
    });
}
