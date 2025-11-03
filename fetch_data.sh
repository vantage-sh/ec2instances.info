#!/bin/sh

set -e

cd scraper
docker build -t ec2instances-scraper .
cd ..
mkdir -p www
docker run --user $(id -u):$(id -g) --rm -e SLACK_WEBHOOK_URL -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -v $(pwd)/www:/app/www ec2instances-scraper
