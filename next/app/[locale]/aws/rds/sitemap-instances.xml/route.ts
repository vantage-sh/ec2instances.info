import { urlInject } from "@/utils/urlInject";
import { readFile } from "fs/promises";
import { SUPPORTED_LOCALES } from "@/utils/fonts";

export const dynamic = "force-static";

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ locale: string }> },
) {
    const { locale } = await params;
    const instanceIds: string[] = JSON.parse(
        await readFile("./public/instance-rds-ids.json", "utf8"),
    );

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${instanceIds.map((id) => urlInject`<url><loc>${`/${locale}/aws/rds/${id}`}</loc></url>`).join("\n")}
</urlset>`;
    return new Response(sitemap, {
        headers: { "Content-Type": "application/xml" },
    });
}
