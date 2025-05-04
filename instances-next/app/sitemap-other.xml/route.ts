export const dynamic = "force-static";

function urlGen(path: string) {
    if (!process.env.NEXT_PUBLIC_URL) {
        throw new Error("NEXT_PUBLIC_URL is not set");
    }
    return new URL(path, process.env.NEXT_PUBLIC_URL).toString();
}


export async function GET() {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${urlGen("/")}</loc>
    </url>
</urlset>`;
    return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
}
