#!/bin/sh

set -e

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "AWS_ACCESS_KEY_ID is not set"
    exit 1
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "AWS_SECRET_ACCESS_KEY is not set"
    exit 1
fi

mkdir -p www/azure www/aws www/cache www/opensearch www/redshift www/rds
docker build -t ec2instances-scraper -f Dockerfile.python .
docker run -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -v $(pwd)/www:/opt/app/www --rm -t ec2instances-scraper invoke build
