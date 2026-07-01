import { urlInject } from "@/utils/urlInject";
import { loadDataJson } from "@/utils/loadDataAsset";
import { DEFAULT_LOCALE } from "@/utils/fonts";

export const dynamic = "force-static";

// Prerender only the default locale; other locales render on demand (ISR).
export function generateStaticParams() {
    return [{ locale: DEFAULT_LOCALE }];
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ locale: string }> },
) {
    const { locale } = await params;
    const instanceIds =
        await loadDataJson<string[]>("instance-ids.json");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
    ${instanceIds.map((id) => {
        const loc = urlInject`${`/${locale}/aws/ec2/${id}`}`;
        const xdefault = urlInject`${`/${DEFAULT_LOCALE}/aws/ec2/${id}`}`;
        return `<url>
        <loc>${loc}</loc>
        <xhtml:link rel="alternate" hreflang="${locale}" href="${loc}"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="${xdefault}"/>
    </url>`;
    }).join("\n    ")}
</urlset>`;
    return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
    });
}
