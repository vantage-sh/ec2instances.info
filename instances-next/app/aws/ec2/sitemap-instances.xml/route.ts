import { urlInject } from "@/utils/urlInject";
import { readFile } from "fs/promises";

export const dynamic = "force-static";

export async function GET() {
    const instanceIds: string[] = JSON.parse(await readFile("./public/instance-ids.json", "utf8"));
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${instanceIds.map((id) => urlInject`<url><loc>${`/aws/ec2/${id}`}</loc></url>`).join("\n")}
</urlset>`;
    return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
}
