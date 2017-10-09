package:
	python scripts/package.py
	pip install -e .
	python setup.py sdist bdist_wheel

pypi: package
	python setup.py sdist bdist_wheel upload

publish: package pypi
