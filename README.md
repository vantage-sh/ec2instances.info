# EC2Instances.info

[![uses aws](https://img.shields.io/badge/uses-AWS-yellow)](https://aws.amazon.com/)
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

## Running locally

First, you'll need to provide credentials so that boto can access the AWS API. [See a terraform example here](./docs/terraform/iam.tf)!
Options for setting this up are described in the [boto
docs](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/configuration.html).

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

## Running in Docker (recommended)

1. Clone the repository, if not already done:

```bash
git clone https://github.com/vantage-sh/ec2instances.info
cd ec2instances.info
```

2. Build a `docker` image:

```bash
docker build -t ec2instances.info .
```

3. Run a container from the built `docker` image:

```bash
docker run -d --name some-container -p 8080:8080 ec2instances.info
```

4. Open [localhost:8080](http://localhost:8080) in your browser to see it in action.

## Docker Compose

Here's how you can build and run docker image using Docker Compose (tested with Docker Compose v2):

```bash
docker-compose up
```

4. Open [localhost:8080](http://localhost:8080) in your browser to see it in action.

## Detailed local build instructions

Note: These instructions are only kept here for reference, the Docker
instructions mentioned above hide all these details and are recommended for local execution.

Make sure you have LibXML and Python development files. On Ubuntu, run `sudo apt-get install python-dev libxml2-dev libxslt1-dev libssl-dev`.

Then:

```bash
git clone https://github.com/vantage-sh/ec2instances.info
cd ec2instances.info/
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
invoke build
deactivate # to exit virtualenv
```

### Faster Local Dev: Only Render the HTML

Running `invoke build` can take 20 minutes. For many changes you may only need to re-render HTML. Run:

```bash
invoke render-html
```

This won't work for data and API changes but for front-end it should serve you well.

## Requirements

- Python with virtualenv
- [Invoke](http://www.pyinvoke.org/)
- [Boto](http://boto.readthedocs.org/en/latest/)
- [lxml](http://lxml.de/)

## Tips for Developing Locally

```
docker build --no-cache --build-arg AWS_ACCESS_KEY_ID= --build-arg AWS_SECRET_ACCESS_KEY= -t ec2instances.info .

docker run -it --rm --name ec2instances -v $(pwd):/opt/app --env HTTP_HOST=0.0.0.0 -p 8080:8080 ec2instances.info

docker exec -it ec2instances /bin/bash

# (if editing css)
sass --watch in/style.scss:www/style.css

# INSIDE CONTAINER
python3 render.py
```

**Note about CSS:** The current container (20.04) doesn't work anymore with sass. Run this outside to make changes to the CSS. Run prettier formatter after on .css and .scss files to pass the linter.

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

## [Internal] Upstreaming changes from ec2instances.info

```
git checkout upstream
git remote add ec2instances.info git@github.com:vantage-sh/ec2instances.info
git remote update
git merge ec2instances.info/master
git checkout master
git merge upstream
git push
```

## [Internal] How the Ads work

Check `vantage.js`. The `vantage_settings()` function is called first thing in `$(document).ready()` in `default.js` and it's called in the beginning of the javascript on each detail page.

It looks up the `vantage` cookie in local storage and sees if the ad tag, a variant of `connect-X` where X is a number, is set. If it is, it hides the ad. If it is not set, it adds a click handler to the X button on the ad. If a user clicks the X button, the ad will be hidden and their preference will be saved to local storage.

To unhide all ads, increment the ad tag.
