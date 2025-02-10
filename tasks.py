# To use this script you must have the following environment variables set:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
# as explained in: http://boto.s3.amazonaws.com/s3_tut.html

import gzip
import mimetypes
import os
import shutil
import traceback

import brotli
from boto import connect_s3
from boto.s3.connection import OrdinaryCallingFormat
from boto.s3.key import Key
from invocations.console import confirm
from invoke import task
from six.moves import SimpleHTTPServer, socketserver

from azurevms import scrape as azure_scrape
from cache import scrape as cache_scrape
from opensearch import scrape as opensearch_scrape
from rds import scrape as rds_scrape
from redshift import scrape as redshift_scrape
from render import about_page, build_sitemap, render
from render_azure import render_azure
from scrape import scrape

BUCKET_NAME = "www.ec2instances.info"

# Work around https://github.com/boto/boto/issues/2836 by explicitly setting
# the calling_format.
BUCKET_CALLING_FORMAT = OrdinaryCallingFormat()

abspath = lambda filename: os.path.join(
    os.path.abspath(os.path.dirname(__file__)), filename
)

HTTP_HOST = os.getenv("HTTP_HOST", "127.0.0.1")
HTTP_PORT = os.getenv("HTTP_PORT", "8080")


@task
def build(c):
    """Scrape AWS sources for data and build the site"""
    scrape_azure(c)
    scrape_ec2(c)
    scrape_rds(c)
    scrape_cache(c)
    scrape_redshift(c)
    scrape_opensearch(c)
    render_html(c)
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


@task
def serve(c):
    class MyHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
        def do_GET(self):
            # The URL does not include ".html". Add it to serve the file for dev
            if "/aws/" in self.path:
                if "?" in self.path:
                    self.path = (
                        self.path.split("?")[0] + ".html?" + self.path.split("?")[1]
                    )
                else:
                    self.path += ".html"
            print(self.path)
            SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

    """Serve site contents locally for development"""
    os.chdir("www/")
    httpd = socketserver.TCPServer((HTTP_HOST, int(HTTP_PORT)), MyHandler)
    print(
        "Serving on http://{}:{}".format(
            httpd.socket.getsockname()[0], httpd.socket.getsockname()[1]
        )
    )
    httpd.serve_forever()


@task
def render_html(c):
    """Render HTML but do not update data from Amazon"""
    sitemap = []
    sitemap.extend(
        render_azure(
            "www/azure/instances.json", "in/azure.html.mako", "www/azure/index.html"
        )
    )
    sitemap.extend(render("www/instances.json", "in/index.html.mako", "www/index.html"))
    sitemap.extend(
        render("www/rds/instances.json", "in/rds.html.mako", "www/rds/index.html")
    )
    sitemap.extend(
        render("www/cache/instances.json", "in/cache.html.mako", "www/cache/index.html")
    )
    sitemap.extend(
        render(
            "www/redshift/instances.json",
            "in/redshift.html.mako",
            "www/redshift/index.html",
        )
    )
    sitemap.extend(
        render(
            "www/opensearch/instances.json",
            "in/opensearch.html.mako",
            "www/opensearch/index.html",
        )
    )
    sitemap.append(about_page())
    build_sitemap(sitemap)


@task
def bucket_create(c):
    """Creates the S3 bucket used to host the site"""
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    bucket = conn.create_bucket(BUCKET_NAME, policy="public-read")
    bucket.configure_website("index.html", "error.html")
    print("Bucket %r created." % BUCKET_NAME)


@task
def bucket_delete(c):
    """Deletes the S3 bucket used to host the site"""
    if not confirm("Are you sure you want to delete the bucket %r?" % BUCKET_NAME):
        print("Aborting at user request.")
        exit(1)
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    conn.delete_bucket(BUCKET_NAME)
    print("Bucket %r deleted." % BUCKET_NAME)


@task
def deploy(c, root_dir="www"):
    """Deploy current content"""
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    bucket = conn.get_bucket(BUCKET_NAME)

    for root, dirs, files in os.walk(root_dir):
        for name in files:
            if name.startswith("."):
                continue
            local_path = os.path.join(root, name)
            remote_path = local_path[len(root_dir) + 1 :]
            print("%s -> %s/%s" % (local_path, BUCKET_NAME, remote_path))
            k = Key(bucket)
            k.key = remote_path

            if name.endswith(".html"):
                upload_file = BytesIO()
                with gzip.GzipFile(fileobj=upload_file, mode="wb") as gz, open(
                    local_path, "rb"
                ) as fp:
                    shutil.copyfileobj(fp, gz)
                upload_file.seek(0)
                k.set_metadata("Content-Type", "text/html")
                k.set_metadata("Content-Encoding", "gzip")
            else:
                upload_file = open(local_path, "rb")

            k.set_contents_from_file(upload_file, policy="public-read")


@task(default=True)
def update(c):
    """Build and deploy the site"""
    build(c)
    deploy(c)
