# OpenNext on Cloudflare — operations notes

This app runs on Cloudflare Workers via `@opennextjs/cloudflare` (SSR + ISR),
replacing the old `output: "export"` static export that was uploaded to KV/R2 by
the retired `deployment/` package and served by `worker.js`.

- Worker config: `next/wrangler.jsonc`
- Adapter config: `next/open-next.config.ts` (R2 incremental cache + DO queue)
- Build artifact: `next/.open-next/` (gitignored)
- Local commands: `npm run preview` (build + local `wrangler dev`),
  `npm run deploy` (build + deploy).

## One-time manual steps (need Cloudflare account credentials)

These are NOT done by CI and must be run once by someone with CF access.

1. **Create the R2 incremental-cache buckets** (one per environment), matching
   the `bucket_name`s in `next/wrangler.jsonc`:

    ```bash
    wrangler r2 bucket create ec2instances-next-cache-production
    wrangler r2 bucket create ec2instances-next-cache-staging
    ```

2. **Update the deploy API token scope.** The token in the
   `CLOUDFLARE_API_TOKEN` secret previously needed Workers KV bulk + R2 S3
   access keys. It now needs **edit** permissions for:

    - Workers Scripts
    - Workers R2 Storage
    - Workers Durable Objects (Durable Objects are SQLite-backed; available on
      the Free plan, but this worker needs **Workers Paid** for the 10 MiB worker
      size limit)

    The old `DEPLOYMENT_CF_*` secrets (S3 access keys, KV namespace id, bucket
    names) are no longer used and can be removed. `DEPLOYMENT_CF_ACCOUNT_ID` is
    still used (passed as `CLOUDFLARE_ACCOUNT_ID`).

3. **First deploy** (from `next/`, with `CLOUDFLARE_API_TOKEN` +
   `CLOUDFLARE_ACCOUNT_ID` set):

    ```bash
    npm ci && npm run init && npm run build:llms
    npx opennextjs-cloudflare build
    npx opennextjs-cloudflare deploy            # production
    npx opennextjs-cloudflare deploy --env staging
    ```

## Redirects (re-homed from worker.js)

- `ec2instances.info` / `www.ec2instances.info` -> `https://instances.vantage.sh`
  is handled by `redirects()` in `next.config.ts`.
- `http -> https` is handled by the Cloudflare zone setting **"Always Use
  HTTPS"** (enable it on the zone if not already on).

## Notes / follow-ups

- The old `ASSETS_KV` namespace and `ec2instances-assets-{production,staging}`
  R2 buckets are no longer bound. Leave them in place; empty/delete only after a
  confirmed cutover.
- On-demand (non-prebuilt) locales fetch their dataset from `NEXT_PUBLIC_URL`
  at runtime (`utils/loadDataAsset`). Each render loads the full provider
  dataset into memory; the worker isolate has ~128 MB, so very large datasets
  (Azure) are a memory risk worth monitoring. A future optimisation is per-slug
  / per-family data splitting (see migration plan §8c).
- `www/updated_at` is still written by `make write-updated-at` but `www/` is no
  longer the served root; if the app surfaces this value, move it into a
  build-time route.

## Known limitations & follow-ups

- **Runtime memory (follow-up):** on-demand (non-prerendered) locale renders
  load the entire provider dataset into the module cache for the isolate's
  lifetime. An isolate that serves several providers can accumulate >128 MB
  (Azure alone decompresses to ~39 MiB). True per-instance data splitting is a
  follow-up (detail pages need the family/variant set, not a single record).
  Mitigation: the prerendered locales (high-traffic) serve static HTML; on-demand
  is the long tail and is cached in R2 after the first render.

- **On-demand miss cost:** a bogus slug or an un-prerendered locale triggers a
  full dataset load before `notFound()`. 404 responses are not reliably cached,
  so this is a minor cost/abuse surface worth noting.

- **Listing pages & sitemap routes** still use `fs.readFile` and are prebuilt
  for all `SUPPORTED_LOCALES`. A request for a locale NOT in `SUPPORTED_LOCALES`
  would 500 rather than 404, depending on whether gt-next middleware rejects the
  unknown locale before the route handler runs.

- **`toasts.json`** is fetched on every on-demand render and throws on a non-200
  response. This was a pre-existing hardcode whose blast radius grew under SSR.

- **Ops (CF dashboard):** add a Cache Rule to normalize/ignore the `?id=` query
  parameter in the edge cache key. The retired worker stripped it; without the
  rule, each `?id=` deep-link is a separate cache entry. Also note the old `.xml`
  cache-control exception that the retired worker handled. Apex/www redirects are
  now 308 (previously 301 from the old worker).

- **Asset count > Cloudflare's 100k hard limit (DEPLOY BLOCKER, follow-up):**
  the build emits ~108k files under `.open-next/assets`, but Cloudflare Workers
  caps a version at **100,000 assets** (a hard platform limit, Free and Paid).
  The bulk is the per-instance OG images + the Next 16 prerendered page files.
  Planned fix (per product decision): do NOT ship all assets via the `assets`
  binding. Instead tier asset serving like the retired `worker.js` did — serve
  from **KV as a bounded cache (max ~100k entries) with R2 (S3-compatible)
  fallback for overflow and large files**. Concretely: keep the hot/most-served
  assets (HTML/RSC/\_next static) in KV up to the cap, and put OG images + the
  compressed data `.xz` (and any overflow beyond 100k) in R2, with the worker
  resolving KV-first then R2. This requires a custom asset handler (or an
  OpenNext static-assets/incremental-cache override) plus the KV+R2 bindings,
  and must be wired and tested against a real Cloudflare env. Until then the
  worker builds green but a full `wrangler deploy` will reject on the asset cap.
