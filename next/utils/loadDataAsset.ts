import { readFile } from "fs/promises";
import path from "path";
import { XzReadableStream } from "xz-decompress";

// In the Cloudflare Workers runtime `navigator.userAgent` is the literal
// "Cloudflare-Workers"; in Node (the `next build` prerender, `next dev` and the
// test runner) it is a Node UA. This is the signal we use to choose between
// reading the bundled data from the local filesystem (build) and fetching it
// from the deployed origin (runtime).
const IS_CLOUDFLARE_RUNTIME =
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers";

/**
 * Load a data file that ships in `next/public`.
 *
 * At build time the file is read straight from the local `public/` directory.
 * At runtime inside a Worker isolate those files are NOT on the worker
 * filesystem (they are served through the `assets` binding), so the file is
 * fetched from the deployed origin instead. `global_fetch_strictly_public`
 * routes the request to the public asset. `process.env.NEXT_PUBLIC_URL` is
 * inlined by Next at build time, so the origin is baked into the bundle.
 *
 * @param assetPath path relative to the public root, e.g. "data/rds/instances.json.xz"
 */
export async function loadDataAsset(assetPath: string): Promise<Uint8Array> {
    const rel = assetPath.replace(/^\/+/, "");
    if (IS_CLOUDFLARE_RUNTIME) {
        const base = process.env.NEXT_PUBLIC_URL;
        if (!base) {
            throw new Error(
                "NEXT_PUBLIC_URL is not set; cannot fetch data asset at runtime",
            );
        }
        const url = new URL(rel, base);
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(
                `Failed to load data asset ${url} (HTTP ${res.status})`,
            );
        }
        return new Uint8Array(await res.arrayBuffer());
    }
    return readFile(path.join(process.cwd(), "public", rel));
}

/** Load and JSON-parse an uncompressed data asset. */
export async function loadDataJson<T>(assetPath: string): Promise<T> {
    const bytes = await loadDataAsset(assetPath);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

/** Decompress an `.xz` payload (lzma-native / xz format) to raw bytes. */
async function decompressXz(bytes: Uint8Array): Promise<Uint8Array> {
    const stream = new XzReadableStream(
        new ReadableStream({
            start(controller) {
                controller.enqueue(bytes);
                controller.close();
            },
        }),
    );
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        out.set(c, offset);
        offset += c.length;
    }
    return out;
}

/** Load and JSON-parse an xz-compressed data asset (e.g. provider datasets). */
export async function loadDataJsonXz<T>(assetPath: string): Promise<T> {
    const compressed = await loadDataAsset(assetPath);
    const json = await decompressXz(compressed);
    return JSON.parse(new TextDecoder().decode(json)) as T;
}
