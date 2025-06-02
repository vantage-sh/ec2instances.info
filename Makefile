.DEFAULT_GOAL := all
.PHONY: fetch-data compress-www next black prettier format all

clean:
	mv www/azure/instances-specs.json specs.json.tmp
	rm -rf www
	mkdir -p www/azure
	mv specs.json.tmp www/azure/instances-specs.json

fetch-data:
	./fetch_data.sh

compress-www:
	tar -cvzf www_pre_build.tar.gz www
	mv www_pre_build.tar.gz www/www_pre_build.tar.gz

next:
	docker build -t ec2instances-node -f next/Dockerfile.base .
	docker run -e NEXT_PUBLIC_URL -e DENY_ROBOTS_TXT -e NEXT_PUBLIC_REMOVE_ADVERTS -e NEXT_PUBLIC_SENTRY_DSN -e SENTRY_ORG -e SENTRY_PROJECT -e SENTRY_AUTH_TOKEN -e OPENGRAPH_URL -e NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID -e NEXT_PUBLIC_ENABLE_VANTAGE_SCRIPT_TAG -e NEXT_PUBLIC_UNIFY_TAG_ID -e NEXT_PUBLIC_UNIFY_API_KEY  -e NEXT_PUBLIC_INSTANCESKV_URL -v $(shell pwd):/app -w /app --rm -t ec2instances-node sh -c 'cd next && npm ci && npm run build'
	cp -a next/out/. www/

package:
	docker build -t ec2instances-scraper -f Dockerfile.python .
	mkdir -p ec2instances
	docker run -v $(shell pwd)/www:/opt/app/www -v $(shell pwd)/.git:/opt/app/.git -v $(shell pwd)/ec2instances:/opt/app/ec2instances --rm -t ec2instances-scraper sh -c 'git config --global --add safe.directory /opt/app && python3 scripts/package.py'

black:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run -v $(shell pwd):/app --rm -t ec2instances-format black .

prettier:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run -v $(shell pwd):/app --rm -t ec2instances-format prettier --write .

format: black prettier

all: clean fetch-data compress-www next package
