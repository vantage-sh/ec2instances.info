.DEFAULT_GOAL := all
.PHONY: fetch-data generate-images compress-www opennext-build write-updated-at gofmt prettier format all

fetch-data:
	./fetch_data.sh

generate-images:
	docker build -t ec2instances-imagegen -f imagegen/Dockerfile .
	mkdir -p www
	docker run --user $(shell id -u):$(shell id -g) --rm -e NEXT_PUBLIC_URL -e OPENGRAPH_URL -v $(shell pwd)/www:/app/www ec2instances-imagegen

compress-www:
	tar -cvzf www_pre_build.tar.gz www
	mv www_pre_build.tar.gz www/www_pre_build.tar.gz

# Build the OpenNext bundle (.open-next/) used to deploy the Worker + assets.
# No more static export, so nothing is copied into www/. CI deploys this via
# `opennextjs-cloudflare deploy` (see .github/workflows/*-release.yml).
opennext-build:
	cd next && npm ci && npm run init && npm run build:llms && npx opennextjs-cloudflare build

write-updated-at:
	echo $(shell date +%s) > www/updated_at

gofmt:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run --user $(shell id -u):$(shell id -g) -v $(shell pwd)/scraper:/app --rm -t ec2instances-format gofmt -w .

prettier:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run --user $(shell id -u):$(shell id -g) -v $(shell pwd):/app --rm -t ec2instances-format prettier --write .

format: gofmt prettier

# Data + OG images only. The Next app is built and deployed separately via the
# OpenNext flow (`make opennext-build` locally, `opennextjs-cloudflare deploy`
# in CI), which consumes the data this target produces.
all: fetch-data compress-www generate-images write-updated-at
