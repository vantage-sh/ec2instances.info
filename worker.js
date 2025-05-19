export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Construct the cache key from the cache URL
        const cacheKey = new Request(url.toString(), request);
        const cache = caches.default;

        const cacheResponse = await cache.match(cacheKey);
        if (cacheResponse) {
            // Bail early if we have a cache hit
            return cacheResponse;
        }

        // Get the path.
        let path;
        try {
            path = decodeURIComponent(url.pathname.substring(1));
        } catch {
            return new Response("Invalid path", {
                status: 400,
            });
        }
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
        if (request.method !== "GET") {
            return new Response("Method not allowed", {
                status: 405,
                headers: {
                    Allow: "GET",
                },
            });
        }

        // Try to get the asset.
        const asset = await env.ASSETS.get(path);
        if (!asset) {
            const notFoundAsset = await env.ASSETS.get("404");
            if (!notFoundAsset) {
                return new Response("Internal server error", {
                    status: 500,
                });
            }
            const headers = new Headers();
            notFoundAsset.writeHttpMetadata(headers);
            headers.set("etag", notFoundAsset.httpEtag);
            return new Response(notFoundAsset.body, {
                status: 404,
                headers,
            });
        }

        const headers = new Headers();
        asset.writeHttpMetadata(headers);
        headers.set("etag", asset.httpEtag);
        if (!path.endsWith(".xml")) {
            // Ignore .xml files because they are for search engines
            headers.append("Cache-Control", "s-maxage=86400");
        }
        const response = new Response(asset.body, {
            headers,
        });

        // Cache the response
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
    },
};
