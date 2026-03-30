# EC2Instances.info

[![uses cloudflare](https://img.shields.io/badge/uses-Cloudflare-orange)](https://cloudflare.com)

![Vantage Picture](https://uploads-ssl.webflow.com/5f9ba05ba40d6414f341df34/5f9bb1764b6670c6f7739564_moutain-scene.svg)

> I was sick of comparing EC2 instance metrics and pricing on Amazon's site so I
> made [EC2Instances.info](https://ec2instances.info).

EC2Instances.info was originally created by [Garret
Heaton](https://github.com/powdahound), is now hosted by
[Vantage](https://vantage.sh/) and developed by the community of contributors.

## Project status

Vantage employees are actively maintaining and hosting the site with the help of contributors here. Improvements in the form of pull requests or ideas via issues are welcome!

People have suggested many neat ideas and feature requests by opening issues on this repository. We also have a [Slack
Community](https://vantage.sh/slack) for anyone to join with a devoted channel named #instances-vantage.sh.

## Requirements

To do a full build, you just need Docker installed. To develop this, however, you will need Docker and it is suggested you also have [nvm](https://nvm.sh) installed. You can technically just use a Node version that matches or is higher than `next/.nvmrc`, though, if you so wish.

## Developing locally

The first thing you should do is run `npm ci` in the root. This is to ensure you have prettier installed as expected.

You then need to either:

- [Scrape the data locally](#scraping-the-data-locally)
- If you aren't touching the scraper, run `curl -L https://instances.vantagestaging.sh/www_pre_build.tar.gz | tar -xzf -` in the root of the repository to grab the latest CI artifact.

To start the development server, cd into the `next` directory and run `nvm use` (run `nvm install` before this if the Node version changed or this is first usage). From here, run `npm ci`, for your first ever time run `npm run init`, and then `npm run dev`. This will start the Next development server. Before you make a pull request, it is suggested you run `npm run check-types` to find any type issues. This will be done before build by the CI, but it does tighten development cycles to do it here.

When you make changes, it is suggested to use the recommended VS Code extensions if that is your editor. If not, tell your editor to auto-format based on the Prettier configuration in the root. Before you make a PR, you should run `make format` in the root to make sure the formatting is correct for the version of gofmt/Prettier we use.

Make sure your pull requests target `develop` since this is our staging. When it is merged into `main`, that is production.

### Scraping the data locally

The scraper is written in Go and fetches data from AWS, Azure, and GCP APIs. You'll need credentials for each provider.

**AWS:** Ensure your IAM user has at least the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstanceTypes",
                "ec2:DescribeSpotPriceHistory",
                "elasticache:DescribeEngineDefaultParameters"
            ],
            "Resource": "*"
        }
    ]
}
```

Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (`.env` is gitignored).

**Azure:** Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_SUBSCRIPTION_ID`. [See the Azure setup guide.](./docs/setting-up-azure.md)

**GCP:** Set `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, and `GCP_PRIVATE_KEY`. [See the GCP setup guide.](./docs/setting-up-gcp.md)

Once credentials are in place, run `./fetch_data.sh` from the repository root. You only need to run this when the scraper is changed in a way that alters the data or there is new API data available you want to test against.

## Building a full release

**NOTE:** This is NOT needed for development in most cases and can on some setups mess with the file permsisions in the next folder leading to needing to clean the build output/temp folders in there. In most development cases, building the next part is sufficient for testing. However, this is needed for production/staging.

To build a full release, you will likely want to clone a clean slate version of the repository. From here, go ahead and run `make all` with the following environment variables:

- `AWS_ACCESS_KEY_ID`: Follow the start of [Developing locally](#developing-locally) to get a AWS key with the correct permissions. This is the key ID for that.
- `AWS_SECRET_ACCESS_KEY`: Follow the start of [Developing locally](#developing-locally) to get a AWS key with the correct permissions. This is the secret access key for that.
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SUBSCRIPTION_ID`: Azure credentials for the scraper. See [the Azure setup guide](./docs/setting-up-azure.md).
- `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`: GCP credentials for the scraper. See [the GCP setup guide](./docs/setting-up-gcp.md).
- `NEXT_PUBLIC_URL`: The public base URL for where the application lives. Probably `https://<hostname>/`.
- `NEXT_PUBLIC_SENTRY_DSN`: **(Optional)** The DSN for Sentry. If you add this, the other items are required:
    - `SENTRY_ORG`: The Sentry organisation.
    - `SENTRY_PROJECT`: The Sentry project.
    - `SENTRY_AUTH_TOKEN`: The Sentry auth token.
- `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID`: **(Optional)** The ID used for Google Tag Manager.
- `NEXT_PUBLIC_ENABLE_VANTAGE_SCRIPT_TAG`: **(Optional)** If set to 1, enables the Vantage script tag. Intended for use internally.
- `NEXT_PUBLIC_UNIFY_TAG_ID`: **(Optional)** The ID for the Unify tag. If this is set, `NEXT_PUBLIC_UNIFY_API_KEY` is also required.
- `NEXT_PUBLIC_INSTANCESKV_URL`: **(Optional)** The base URL you wish to use for [instanceskv](https://github.com/vantage-sh/instanceskv). If this is unset, it will use the version hosted by Vantage.
- `SLACK_WEBHOOK_URL`: **(Optional)** A Slack webhook to send scraping warnings to.

**Important:** If you don't want your build to be indexed by search engines, you should also set `DENY_ROBOTS_TXT=1`. To remove adverts, you can also add `NEXT_PUBLIC_REMOVE_ADVERTS=1`. You should also set `OPENGRAPH_URL=<some url>` to a URL which serves a 1911x1156 JPEG background image for OG image generation; if you aren't Vantage and deploying to production, this is required as the default background is not MIT licensed.

This will take ~30 minutes, and when it is done you will have a `www` folder with the content you can deploy to your web server. Your web server should do the following:

- `/index.html` or `/index` should redirect to `/`
- Trailing slashes should redirect without them.
- Anything path ending `.html` should either 404 or redirect to the site without that.
- 404's should show a 404 and display the content in `/404.html`.

The logic we use to do this (a mix of a scripted push to R2 and a small Cloudflare Worker) can be found in `deployment/index.ts` and `worker.js`.

## Keep up-to-date

Feel free to watch/star this repo as we're looking to update the site regularly. Vantage also works on the following relevant projects:

- [vantage.sh/models](https://vantage.sh/models) - An open-source site for comparing LLM prices, specifications, benchmarks, and hosting information.
- [cur.vantage.sh](https://cur.vantage.sh/) - Definitions of all AWS Cost and Usage Report (CUR) billing codes by service.
- [The Cloud Cost Handbook](https://github.com/vantage-sh/handbook) - An
  open-source set of guides for best practices of managing cloud costs.
- [The AWS Cost Leaderboard](https://leaderboard.vantage.sh/) - A hosted site of
  the top AWS cost centers.
- [Vantage](https://vantage.sh/) - A cloud cost transparency platform.
