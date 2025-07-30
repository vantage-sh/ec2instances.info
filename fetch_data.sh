#!/bin/sh

set -e

cd scraper && docker build -t ec2instances-scraper . && cd ..
mkdir -p www
docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AZURE_TENANT_ID -e AZURE_CLIENT_ID -e AZURE_CLIENT_SECRET -e AZURE_SUBSCRIPTION_ID -v $(pwd)/www:/app/www ec2instances-scraper
