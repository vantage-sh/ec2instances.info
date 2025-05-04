import { readFile } from "fs/promises";

export const dynamic = "force-static";

function urlGen(id: string) {
    if (!process.env.NEXT_PUBLIC_URL) {
        throw new Error("NEXT_PUBLIC_URL is not set");
    }
    return new URL(`/aws/ec2/${id}`, process.env.NEXT_PUBLIC_URL).toString();
}

export async function GET() {
    const instanceIds: string[] = JSON.parse(await readFile("./public/instance-ids.json", "utf8"));
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${instanceIds.map((id) => `<url><loc>${urlGen(id)}</loc></url>`).join("\n")}
</urlset>`;
    return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
}

