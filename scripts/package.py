#!/usr/bin/env python

import pprint
import json
import subprocess

root_dir = subprocess.check_output([
    'git', 'rev-parse', '--show-toplevel'
    ]).decode().strip()


def path(s):
    return "{}/{}".format(root_dir, s)


# Create the output directory
subprocess.call(['mkdir', '-p', '{}/ec2instances/info'.format(root_dir)])
# Make the project a module
subprocess.call(['touch', '{}/ec2instances/__init__.py'.format(root_dir)])
subprocess.call(['touch', '{}/ec2instances/info/__init__.py'.format(root_dir)])


with open(path('ec2instances/info/__init__.py'), 'a') as output:
    # Final output will look like the following, though pretty-printed:
    #
    #  ec2 = [{'instance_type': 't2.micro', ...}, ...]
    #  rds = [{'instance_type': 'db.t2.small', ...}, ...]
    #
    with open(path('www/instances.json'), 'r') as input:
        rds = json.loads(input.read())
        output.write("ec2 = {}".format(pprint.pformat(rds)))

    output.write("\n")

    with open(path('www/rds/instances.json'), 'r') as input:
        rds = json.loads(input.read())
        output.write("rds = {}".format(pprint.pformat(rds)))
