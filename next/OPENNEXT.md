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
