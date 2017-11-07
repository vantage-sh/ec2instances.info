# To use this script you must have the following environment variables set:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
# as explained in: http://boto.s3.amazonaws.com/s3_tut.html

import SimpleHTTPServer
import SocketServer
import os
import traceback

from boto import connect_s3
from boto.s3.connection import OrdinaryCallingFormat
from boto.s3.key import Key
from fabric.api import abort, task
from fabric.contrib.console import confirm

from rds import scrape as rds_scrape
from render import render
from scrape import scrape

BUCKET_NAME = 'www.ec2instances.info'

# Work around https://github.com/boto/boto/issues/2836 by explicitly setting
# the calling_format.
BUCKET_CALLING_FORMAT = OrdinaryCallingFormat()

abspath = lambda filename: os.path.join(os.path.abspath(os.path.dirname(__file__)),
                                        filename)

FAB_HOST = os.getenv('FAB_HOST', '127.0.0.1')
FAB_PORT = os.getenv('FAB_PORT', '')

@task
def build():
    """Scrape AWS sources for data and build the site"""
    scrape_ec2()
    scrape_rds()
    render_html()


@task
def scrape_ec2():
    """Scrape EC2 data from AWS and save to local file"""
    ec2_file = 'www/instances.json'
    try:
        scrape(ec2_file)
    except Exception as e:
        print "ERROR: Unable to scrape data: %s" % e
        print traceback.print_exc()


@task
def scrape_rds():
    """Scrape RDS data from AWS and save to local file"""
    rds_file = 'www/rds/instances.json'
    try:
        rds_scrape(rds_file)
    except Exception as e:
        print "ERROR: Unable to scrape RDS data: %s" % e
        print traceback.print_exc()


@task
def serve():
    """Serve site contents locally for development"""
    os.chdir("www/")
    httpd = SocketServer.TCPServer((FAB_HOST, int(FAB_PORT)), SimpleHTTPServer.SimpleHTTPRequestHandler)
    print "Serving on http://{}:{}".format(httpd.socket.getsockname()[0], httpd.socket.getsockname()[1])
    httpd.serve_forever()


@task
def render_html():
    """Render HTML but do not update data from Amazon"""
    render('www/instances.json', 'in/index.html.mako', 'www/index.html')
    render('www/rds/instances.json', 'in/rds.html.mako', 'www/rds/index.html')


@task
def bucket_create():
    """Creates the S3 bucket used to host the site"""
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    bucket = conn.create_bucket(BUCKET_NAME, policy='public-read')
    bucket.configure_website('index.html', 'error.html')
    print 'Bucket %r created.' % BUCKET_NAME


@task
def bucket_delete():
    """Deletes the S3 bucket used to host the site"""
    if not confirm("Are you sure you want to delete the bucket %r?" % BUCKET_NAME):
        abort('Aborting at user request.')
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    conn.delete_bucket(BUCKET_NAME)
    print 'Bucket %r deleted.' % BUCKET_NAME


@task
def deploy(root_dir='www'):
    """Deploy current content"""
    conn = connect_s3(calling_format=BUCKET_CALLING_FORMAT)
    bucket = conn.get_bucket(BUCKET_NAME)

    for root, dirs, files in os.walk(root_dir):
        for name in files:
            if name.startswith('.'):
                continue
            local_path = os.path.join(root, name)
            remote_path = local_path[len(root_dir)+1:]
            print '%s -> %s/%s' % (local_path, BUCKET_NAME, remote_path)
            k = Key(bucket)
            k.key = remote_path
            k.set_contents_from_filename(local_path, policy='public-read')


@task(default=True)
def update():
    """Build and deploy the site"""
    build()
    deploy()