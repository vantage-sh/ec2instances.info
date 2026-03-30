.DEFAULT_GOAL := all
.PHONY: fetch-data generate-images compress-www next write-updated-at gofmt prettier format all

fetch-data:
	./fetch_data.sh

generate-images:
	docker build -t ec2instances-imagegen -f imagegen/Dockerfile .
	mkdir -p www
	docker run --user $(shell id -u):$(shell id -g) --rm -e NEXT_PUBLIC_URL -e OPENGRAPH_URL -v $(shell pwd)/www:/app/www ec2instances-imagegen

compress-www:
	tar -cvzf www_pre_build.tar.gz www
	mv www_pre_build.tar.gz www/www_pre_build.tar.gz

next:
	docker build -t ec2instances-node -f next/Dockerfile.base .
	docker run -e NEXT_PUBLIC_URL -e DENY_ROBOTS_TXT -e NEXT_PUBLIC_REMOVE_ADVERTS -e NEXT_PUBLIC_SENTRY_DSN -e SENTRY_ORG -e SENTRY_PROJECT -e SENTRY_AUTH_TOKEN -e OPENGRAPH_URL -e NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID -e NEXT_PUBLIC_ENABLE_VANTAGE_SCRIPT_TAG -e NEXT_PUBLIC_UNIFY_TAG_ID -e NEXT_PUBLIC_UNIFY_API_KEY -e NEXT_PUBLIC_INSTANCESKV_URL -v $(shell pwd):/app -w /app --rm -t ec2instances-node sh -c 'cd next && npm ci && npm run build'
	cp -a next/out/. www/

write-updated-at:
	echo $(shell date +%s) > www/updated_at

gofmt:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run --user $(shell id -u):$(shell id -g) -v $(shell pwd)/scraper:/app --rm -t ec2instances-format gofmt -w .

prettier:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run --user $(shell id -u):$(shell id -g) -v $(shell pwd):/app --rm -t ec2instances-format prettier --write .

format: gofmt prettier

all: fetch-data generate-images compress-www next write-updated-at
