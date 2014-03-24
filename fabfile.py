# To use this script you must have the following environment variables set:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
# as explained in: http://boto.s3.amazonaws.com/s3_tut.html

import os
import webbrowser

from boto import connect_s3
from boto.s3.key import Key
from fabric.api import abort, task
from fabric.contrib.console import confirm
from render import render
from scrape import scrape

BUCKET_NAME = 'www.ec2instances.info'

abspath = lambda filename: os.path.join(os.path.abspath(os.path.dirname(__file__)),
                                        filename)

@task
def build():
    """Scrape AWS sources for data and build the site"""
    data_file = 'www/instances.json'
    scrape(data_file)
    render(data_file, 'in/index.html.mako', 'www/index.html')

@task
def preview():
    url = 'file://localhost/%s' % (abspath('www/index.html'))
    webbrowser.open(url, new=2)

@task
def bucket_create():
    """Creates the S3 bucket used to host the site"""
    conn = connect_s3()
    bucket = conn.create_bucket(BUCKET_NAME, policy='public-read')
    bucket.configure_website('index.html', 'error.html')
    print 'Bucket %r created.' % BUCKET_NAME

@task
def bucket_delete():
    """Deletes the S3 bucket used to host the site"""
    if not confirm("Are you sure you want to delete the bucket %r?" % BUCKET_NAME):
        abort('Aborting at user request.')
    conn = connect_s3()
    conn.delete_bucket(BUCKET_NAME)
    print 'Bucket %r deleted.' % BUCKET_NAME

@task
def deploy(root_dir='www'):
    """Deploy current content"""
    conn = connect_s3()
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
            headers = {
                "Cache-Control": "max-age=86400, must-revalidate"}
            k.set_contents_from_filename(local_path, headers=headers,
                                         policy='public-read')

@task(default=True)
def update():
    """Build and deploy the site"""
    build()
    deploy()
