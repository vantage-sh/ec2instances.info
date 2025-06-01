/**
 * You can self-host this yourself if you want! If you want to, simply put https://github.com/vantage-sh/instanceskv
 * on a server/Cloudflare Worker somewhere and then set the NEXT_PUBLIC_COLUMN_KV_URL environment variable to the URL
 * of your instance. We run our own version and hardcode it because its what production/staging uses and its just easier.
 */
const url =
    process.env.NEXT_PUBLIC_COLUMN_KV_URL ||
    // TODO: change this URL
    "https://instanceskv.vantagesh.workers.dev/";

type DumpV1 = {
    version: 1;
    filter: string;
    columns: {
        id: string;
        value: any;
    }[];
    pricingUnit: string;
    costDuration: string;
    region: string;
    reservedTerm: string;
    compareOn: boolean;
    selected: string[];
    visibleColumns: Record<string, boolean>;
    sort: {
        id: string;
        desc: boolean;
    }[];
};

export type StateDump = DumpV1;

export async function get(id: string): Promise<StateDump> {
    const u = new URL(url);
    if (!u.pathname.endsWith("/")) u.pathname += "/";
    u.pathname += encodeURIComponent(id);

    const res = await fetch(u.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to get instance ${id}: ${res.status} ${text}`);
    }

    return res.json();
}

export async function write(dump: StateDump): Promise<string> {
    const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(dump),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to write instance: ${res.status} ${text}`);
    }

    return res.text();
}
