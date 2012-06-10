# To use this script you must have the following environment variables set:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
# as explained in: http://boto.s3.amazonaws.com/s3_tut.html

import os
from boto import connect_s3
from boto.s3.key import Key
from fabric.api import abort
from fabric.contrib.console import confirm

bucket_name = 'www.ec2instances.info'

def create_bucket():
    conn = connect_s3()
    bucket = conn.create_bucket(bucket_name, policy='public-read')
    bucket.configure_website('index.html', 'error.html')

def deploy(dir='www'):
    conn = connect_s3()
    bucket = conn.get_bucket(bucket_name)

    for root, dirs, files in os.walk(dir):
        for name in files:
            filename = os.path.join(root, name)
            print 'Uploading %s' % filename
            k = Key(bucket)
            k.key = name
            headers = {}
            k.set_contents_from_filename(filename, headers=headers,
                                         policy='public-read')

def delete():
    if not confirm("Are you sure you want to delete the bucket %r?"
            % bucket_name):
        abort('Aborting at user request.')
    conn = connect_s3()
    conn.delete_bucket(bucket_name)
    print 'Bucket %r deleted.' % bucket_name

