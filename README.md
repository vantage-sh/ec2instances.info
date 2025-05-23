# EC2Instances.info

[![uses cloudflare](https://img.shields.io/badge/uses-Cloudflare-orange)](https://cloudflare.com)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/release/python-380/)
[![python style: black](https://img.shields.io/badge/python%20style-black-000000.svg?style=flat-square)](https://github.com/psf/black)

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

You'll need to provide credentials so that boto can access the AWS API. Options for setting this up are described in the [boto docs](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/configuration.html).

Ensure that your IAM user has at least the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstanceTypes",
                "ec2:DescribeRegions",
                "pricing:*",
                "elasticache:DescribeEngineDefaultParameters"
            ],
            "Resource": "*"
        }
    ]
}
```

When you have made these credentials, go ahead and store them somewhere safe (`.env` is gitignored), and then you will want to fetch all of the data. You can do this with the following command:

```sh
AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY" make fetch-data
```

Now go ahead and grab yourself a cup of tea or coffee because this will take 20-30 minutes. You only need to run this when the Python is changed in a way that alters the data or there is new API data available you want to test against.

To start the development server, cd into the `next` directory and run `nvm use` (run `nvm install` before this if the Node version changed or this is first usage). From here, run `npm ci`, for your first ever time run `npm run init`, and then `npm run dev`. This will start the Next development server. Before you make a pull request, it is suggested you run `npm run check-types` to find any type issues. This will be done before build by the CI, but it does tighten development cycles to do it here.

When you make changes, it is suggested to use the recommended VS Code extensions if that is your editor. If not, tell your editor to auto-format based on the Prettier configuration in the root. Before you make a PR, you should run `make format` in the root to make sure the formatting is correct for the version of Black/Prettier we use.

Make sure your pull requests target `develop` since this is our staging. When it is merged into `main`, that is production.

## Building a full release

**NOTE:** This is NOT needed for development in most cases and can on some setups mess with the file permsisions in the next folder leading to needing to clean the build output/temp folders in there. In most development cases, building the next part is sufficient for testing. However, this is needed for production/staging.

To build a full release, you will likely want to clone a clean slate version of the repository. From here, go ahead and run `make all` with the following environment variables:

- `AWS_ACCESS_KEY_ID`: Follow the start of [Developing locally](#developing-locally) to get a AWS key with the correct permissions. This is the key ID for that.
- `AWS_SECRET_ACCESS_KEY`: Follow the start of [Developing locally](#developing-locally) to get a AWS key with the correct permissions. This is the secret access key for that.
- `NEXT_PUBLIC_URL`: The public base URL for where the application lives. Probably `https://<hostname>/`.

**Important:** If you don't want your build to be indexed by search engines, you should also set `DENY_ROBOTS_TXT=1`. To remove adverts, you can also add `NEXT_PUBLIC_REMOVE_ADVERTS=1`.

This will take ~30 minutes, and when it is done you will have a `www` folder with the content you can deploy to your web server. Your web server should do the following:

- `/index.html` or `/index` should redirect to `/`
- Trailing slashes should redirect without them.
- Anything path ending `.html` should either 404 or redirect to the site without that.
- 404's should show a 404 and display the content in `/404.html`.

The logic we use to do this (a mix of a scripted push to R2 and a small Cloudflare Worker) can be found in `deployment/index.ts` and `worker.js`.

## API Access

The data backing EC2Instances.info is available via a free API.

- To get started, create a [free API key](https://vantage.readme.io/reference/authentication).
- Review the `providers`, `services`, and `products` endpoints in the [API documentation](https://vantage.readme.io/reference/getproducts).

## Keep up-to-date

Feel free to watch/star this repo as we're looking to update the site regularly. Vantage also works on the following relevant projects:

- [cur.vantage.sh](https://cur.vantage.sh/) - Definitions of all AWS Cost and Usage Report (CUR) billing codes by service.
- [The Cloud Cost Handbook](https://github.com/vantage-sh/handbook) - An
  open-source set of guides for best practices of managing cloud costs.
- [The AWS Cost Leaderboard](https://leaderboard.vantage.sh/) - A hosted site of
  the top AWS cost centers.
- [Vantage](https://vantage.sh/) - A cloud cost transparency platform.
