async function getAsset(path, env, ctx, cacheKey, isHead) {
    // Attempt to decode the path.
    try {
        path = decodeURIComponent(path);
    } catch {
        return new Response(isHead ? null : "Invalid path", {
            status: 400,
        });
    }

    const value = await env.ASSETS_KV.getWithMetadata(path, {
        type: "stream",
    });
    if (!value.value) {
        // Check the bucket
        const bucket = await env.ASSETS_BUCKET.get(path);
        if (!bucket) {
            // Handle a 404
            const notFoundAsset = await env.ASSETS_KV.get("404", {
                type: "arrayBuffer",
            });
            if (!notFoundAsset) {
                return new Response(isHead ? null : "Internal server error", {
                    status: 500,
                });
            }
            return new Response(isHead ? null : notFoundAsset, {
                status: 404,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                },
            });
        }

        // Write the asset to the cache and return it
        const headers = new Headers();
        bucket.writeHttpMetadata(headers);
        headers.set("etag", bucket.httpEtag);
        if (!path.endsWith(".xml")) {
            // Ignore .xml files because they are for search engines
            headers.append("Cache-Control", "s-maxage=86400");
        }
        const resp = new Response(isHead ? null : bucket.body, {
            headers,
        });
        ctx.waitUntil(caches.default.put(cacheKey, resp.clone()));
        return resp;
    }

    // Return the asset from the cache.
    const xmlLine = path.endsWith(".xml")
        ? {}
        : { "Cache-Control": "s-maxage=86400" };
    const resp = new Response(value.value, {
        status: path === "404" ? 404 : 200,
        headers: {
            ...value.metadata,
            ...xmlLine,
        },
    });
    ctx.waitUntil(caches.default.put(cacheKey, resp.clone()));
    return resp;
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle old hostname redirects.
        if (
            url.hostname === "ec2instances.info" ||
            url.hostname === "www.ec2instances.info"
        ) {
            url.hostname = "instances.vantage.sh";
            return Response.redirect(url, 301);
        }

        // Handle HTTP redirects.
        if (url.protocol === "http:") {
            url.protocol = "https:";
            return Response.redirect(url, 301);
        }

        // Construct the cache key from the cache URL
        const cacheUrl = new URL(url);
        cacheUrl.searchParams.delete("id");
        const cacheKey = new Request(cacheUrl.toString(), request);
        const cache = caches.default;

        const cacheResponse = await cache.match(cacheKey);
        if (cacheResponse) {
            // Bail early if we have a cache hit
            return cacheResponse;
        }

        // Get the path.
        let path = url.pathname.substring(1);
        if (path === "index.html") {
            // Redirect to root
            url.pathname = "/";
            return Response.redirect(url, 301);
        }
        if (path === "") path = "index.html";
        if (path.endsWith("/")) {
            // Redirect to no trailing slash
            url.pathname = "/" + path.slice(0, -1);
            return Response.redirect(url, 301);
        }

        // Handle non-GET requests.
        if (request.method !== "GET" && request.method !== "HEAD") {
            return new Response("Method not allowed", {
                status: 405,
                headers: {
                    Allow: "GET, HEAD",
                },
            });
        }

        // Try to get the asset.
        return await getAsset(
            path,
            env,
            ctx,
            cacheKey,
            request.method === "HEAD",
        );
    },
};
