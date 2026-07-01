import { Instance } from "@/utils/colunnData/redshift";
import { urlInject } from "@/utils/urlInject";
import { loadDataJsonXz } from "@/utils/loadDataAsset";
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
    const instances = await loadDataJsonXz<Instance[]>(
        "data/redshift/instances.json.xz",
    );
    const instanceIds = instances.map((instance) => instance.instance_type);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${instanceIds.map((id) => urlInject`<url><loc>${`/${locale}/aws/redshift/${id}`}</loc></url>`).join("\n")}
</urlset>`;
    return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
    });
}
