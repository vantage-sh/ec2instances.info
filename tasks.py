# To use this script you must have the following environment variables set:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
# as explained in: http://boto.s3.amazonaws.com/s3_tut.html

import os
import traceback

from boto import connect_s3
from boto.s3.connection import OrdinaryCallingFormat
from boto.s3.key import Key
from invoke import task
from invocations.console import confirm
from six.moves import SimpleHTTPServer, socketserver

from rds import scrape as rds_scrape
from render import render
from scrape import scrape

from io import BytesIO
import gzip
import shutil

BUCKET_NAME = 'www.ec2instances.info'

# Work around https://github.com/boto/boto/issues/2836 by explicitly setting
# the calling_format.
BUCKET_CALLING_FORMAT = OrdinaryCallingFormat()

abspath = lambda filename: os.path.join(os.path.abspath(os.path.dirname(__file__)),
                                        filename)

HTTP_HOST = os.getenv('HTTP_HOST', '0.0.0.0')
HTTP_PORT = os.getenv('HTTP_PORT', '8080')


@task
def build(c):
    """Scrape AWS sources for data and build the site"""
    scrape_ec2(c)
    scrape_rds(c)
    render_html(c)


@task
def scrape_ec2(c):
    """Scrape EC2 data from AWS and save to local file"""
    ec2_file = 'www/instances.json'
    try:
        scrape(ec2_file)
    except Exception as e:
        print("ERROR: Unable to scrape EC2 data")
        print(traceback.print_exc())


@task
def scrape_rds(c):
    """Scrape RDS data from AWS and save to local file"""
    rds_file = 'www/rds/instances.json'
    try:
        rds_scrape(rds_file)
    except Exception as e:
        print("ERROR: Unable to scrape RDS data")
        print(traceback.print_exc())


@task
def serve(c):
    """Serve site contents locally for development"""
    os.chdir("www/")
    httpd = socketserver.TCPServer((HTTP_HOST, int(HTTP_PORT)), SimpleHTTPServer.SimpleHTTPRequestHandler)
    print("Serving on http://{}:{}".format(httpd.socket.getsockname()[0], httpd.socket.getsockname()[1]))
    httpd.serve_forever()


@task
def render_html(c):
    """Render HTML but do not update data from Amazon"""
    render('www/instances.json', 'in/index.html.mako', 'www/index.html')
    render('www/rds/instances.json', 'in/rds.html.mako', 'www/rds/index.html')


@task
def bucket_create(c):
    """Creates the S3 bucket used to host the site"""
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    bucket = conn.create_bucket(BUCKET_NAME, policy='public-read')
    bucket.configure_website('index.html', 'error.html')
    print('Bucket %r created.' % BUCKET_NAME)


@task
def bucket_delete(c):
    """Deletes the S3 bucket used to host the site"""
    if not confirm("Are you sure you want to delete the bucket %r?" % BUCKET_NAME):
        print('Aborting at user request.')
        exit(1)
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    conn.delete_bucket(BUCKET_NAME)
    print('Bucket %r deleted.' % BUCKET_NAME)


@task
def deploy(c, root_dir='www'):
    """Deploy current content"""
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    bucket = conn.get_bucket(BUCKET_NAME)

    for root, dirs, files in os.walk(root_dir):
        for name in files:
            if name.startswith('.'):
                continue
            local_path = os.path.join(root, name)
            remote_path = local_path[len(root_dir) + 1:]
            print('%s -> %s/%s' % (local_path, BUCKET_NAME, remote_path))
            k = Key(bucket)
            k.key = remote_path

            if name.endswith('.html'):
                upload_file = BytesIO()
                with gzip.GzipFile(fileobj=upload_file, mode='wb')as gz,  open(local_path, 'rb') as fp:
                    shutil.copyfileobj(fp, gz)
                upload_file.seek(0)
                k.set_metadata('Content-Type', 'text/html')
                k.set_metadata('Content-Encoding', 'gzip')
            else:
                upload_file = open(local_path, 'rb')



            k.set_contents_from_file(upload_file, policy='public-read')


@task(default=True)
def update(c):
    """Build and deploy the site"""
    build(c)
    deploy(c)
