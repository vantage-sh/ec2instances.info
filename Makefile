.DEFAULT_GOAL := all
.PHONY: fetch-data next

clean:
	mv www/azure/instances-specs.json specs.json.tmp
	rm -rf www
	mkdir -p www/azure
	mv specs.json.tmp www/azure/instances-specs.json

fetch-data:
	./fetch_data.sh

next:
	docker run -e NEXT_PUBLIC_URL -v $(shell pwd):/app -w /app --rm -it node:$(shell cat next/.nvmrc | tr -d 'v')-alpine sh -c 'cd next && npm ci && npm run build'
	cp -r next/out/ www/

package:
	docker build -t ec2instances-scraper -f Dockerfile.python .
	mkdir -p ec2instances
	docker run -v $(shell pwd)/www:/opt/app/www -v $(shell pwd)/.git:/opt/app/.git -v $(shell pwd)/ec2instances:/opt/app/ec2instances --rm -it ec2instances-scraper sh -c 'git config --global --add safe.directory /opt/app && python3 scripts/package.py'

pypi-upload:
	python setup.py sdist bdist_wheel upload

black:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run -v $(shell pwd):/app --rm -it ec2instances-format black .

prettier:
	docker build -t ec2instances-format -f Dockerfile.format .
	docker run -v $(shell pwd):/app --rm -it ec2instances-format prettier --write .

format: black prettier

all: clean fetch-data next package

publish: all pypi-upload
