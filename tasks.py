# To use this script you must have the following environment variables set:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
# as explained in: http://boto.s3.amazonaws.com/s3_tut.html

import gzip
import mimetypes
import os
import shutil
import traceback
import concurrent.futures

import brotli
from invoke import task

from azurevms import scrape as azure_scrape
from cache import scrape as cache_scrape
from opensearch import scrape as opensearch_scrape
from rds import scrape as rds_scrape
from redshift import scrape as redshift_scrape
from scrape import scrape

abspath = lambda filename: os.path.join(
    os.path.abspath(os.path.dirname(__file__)), filename
)


@task
def build(c):
    """Scrape AWS sources for data and build the site in parallel"""
    scraper_functions = [
        scrape_azure,
        scrape_ec2,
        scrape_rds,
        scrape_cache,
        scrape_redshift,
        scrape_opensearch,
    ]

    # Update max workers as we add more scrapers
    max_workers = 6
    print(f"Starting parallel scraping of all services with {max_workers} workers...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_scraper = {
            executor.submit(scraper, c): scraper.__name__
            for scraper in scraper_functions
        }

        for future in concurrent.futures.as_completed(future_to_scraper):
            scraper_name = future_to_scraper[future]
            try:
                future.result()
                print(f"✅ Completed scraping for {scraper_name}")
            except Exception as exc:
                print(f"❌ {scraper_name} generated an exception: {exc}")
                import traceback

                traceback.print_exc()

    print("All scraping tasks completed. Proceeding with rendering and compression...")
    compress_json_files(c)


@task
def compress(c):
    compress_json_files(c)


@task
def scrape_ec2(c):
    """Scrape EC2 data from AWS and save to local file"""
    ec2_file = "www/instances.json"
    scrape(ec2_file)


@task
def scrape_rds(c):
    """Scrape RDS data from AWS and save to local file"""
    rds_file = "www/rds/instances.json"
    rds_scrape(rds_file)


def scrape_cache(c):
    """Scrape Cache instance data from AWS and save to local file"""
    cache_file = "www/cache/instances.json"
    cache_scrape(cache_file)


def scrape_redshift(c):
    """Scrape Redshift instance data from AWS and save to local file"""
    redshift_file = "www/redshift/instances.json"
    redshift_scrape(redshift_file)


def scrape_opensearch(c):
    """Scrape OpenSearch instance data from AWS and save to local file"""
    opensearch_file = "www/opensearch/instances.json"
    opensearch_scrape(opensearch_file)


def scrape_azure(c):
    """Scrape Azure VM data from Microsoft and save to local file"""
    azure_file = "www/azure/instances.json"
    azure_scrape(azure_file)


def compress_json_files(c):
    """Compress JSON files with gzip and brotli"""
    for root, _, files in os.walk("www"):
        for name in files:
            if name.endswith(".json"):
                print("Compressing %s" % name)

                local_path = os.path.join(root, name)
                with open(local_path, "rb") as f:
                    data = f.read()

                    compressed_gzip = gzip.compress(data)
                    gzip_path = local_path + ".gz"
                    gzip_file = open(gzip_path, "wb")
                    gzip_file.write(compressed_gzip)
                    gzip_file.close()

                    compressed_brotli = brotli.compress(data)
                    brotli_path = local_path + ".br"
                    brotli_file = open(brotli_path, "wb")
                    brotli_file.write(compressed_brotli)
                    brotli_file.close()
