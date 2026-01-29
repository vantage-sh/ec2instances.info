#!/bin/sh

set -e

cd scraper

if command -v depot &> /dev/null; then
    echo "Using depot CLI to build the scraper image"
    depot build -t ec2instances-scraper .
else
    echo "Using docker to build the scraper image"
    docker build -t ec2instances-scraper .
fi

cd ..
mkdir -p www
docker run --user $(id -u):$(id -g) --rm -e SLACK_WEBHOOK_URL -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AZURE_TENANT_ID -e AZURE_CLIENT_ID -e AZURE_CLIENT_SECRET -e AZURE_SUBSCRIPTION_ID -e GCP_PROJECT_ID -e GCP_CLIENT_EMAIL -e GCP_PRIVATE_KEY -v $(pwd)/www:/app/www ec2instances-scraper
