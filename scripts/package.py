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
subprocess.call(['mkdir', '-p', path('ec2instances/info')])
# Make the project a module
subprocess.call(['touch', path('ec2instances/__init__.py')])


with open(path('ec2instances/info/__init__.py'), 'w') as output:
    # Final output will look like the following, though pretty-printed:
    #
    #  ec2 = [{'instance_type': 't2.micro', ...}, ...]
    #  rds = [{'instance_type': 'db.t2.small', ...}, ...]
    #
    with open(path('www/instances.json'), 'r') as input:
        ec2 = json.loads(input.read())
        output.write("ec2 = {}".format(pprint.pformat(ec2)))

    output.write("\n")

    with open(path('www/rds/instances.json'), 'r') as input:
        rds = json.loads(input.read())
        output.write("rds = {}".format(pprint.pformat(rds)))

    output.write("\n")
