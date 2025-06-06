export const dynamic = "force-static";

function urlGen(path: string) {
    if (!process.env.NEXT_PUBLIC_URL) {
        throw new Error("NEXT_PUBLIC_URL is not set");
    }
    return new URL(path, process.env.NEXT_PUBLIC_URL).toString();
}

export async function GET() {
    if (process.env.DENY_ROBOTS_TXT === "1") {
        return new Response("User-agent: *\nDisallow: /", {
            headers: { "Content-Type": "text/plain" },
        });
    }

    const robots = `User-agent: *
Allow: /
Sitemap: ${urlGen("/sitemap_index.xml")}
`;
    return new Response(robots, { headers: { "Content-Type": "text/plain" } });
}
