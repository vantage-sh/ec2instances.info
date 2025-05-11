.DEFAULT_GOAL := all
.PHONY: fetch-data next

fetch-data:
	./fetch_data.sh

next:
	cd next && ~/.nvm/nvm.sh install && ~/.nvm/nvm.sh use && npm ci && npm run build
	cp -r next/out/ www/

package:
	python scripts/package.py
	pip install -e .

pypi: package
	python setup.py sdist bdist_wheel upload

publish: package pypi

format: black prettier

black:
	black .

prettier:
	prettier --write .

all: fetch-data next pypi
