package:
	python scripts/package.py
	pip install -e .

pypi: package
	python setup.py sdist bdist_wheel upload

publish: package pypi

format: black prettier nixpkgs-fmt

black:
	black .

prettier:
	prettier --write .

nixpkgs-fmt:
	nixpkgs-fmt .


deploy-opszero:
	wrangler pages deploy --project-name instance-select ./build/