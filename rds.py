#!/usr/bin/env python
import requests
import json

output_file = './www/rds.json'
price_index = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/index.json'
index = requests.get(price_index)
data = index.json()

rds_instances = {}

# region mapping, someone thought it was handy not to include the region id's :(
regions = {
    "AWS GovCloud (US)": 'us-gov-west-1',
    "Asia Pacific (Singapore)": 'ap-southeast-1',
    "Asia Pacific (Sydney)": 'ap-southeast-2',
    "Asia Pacific (Tokyo)": 'ap-northeast-1',
    "EU (Frankfurt)": 'eu-central-1',
    "EU (Ireland)": 'eu-west-1',
    "South America (Sao Paulo)": 'sa-east-1',
    "US East (N. Virginia)": 'us-east-1',
    "US West (N. California)": 'us-west-1',
    "US West (Oregon)": 'us-west-2'
}

# loop through products, and only fetch available instances for now
for product in data['products']:
    if product['productFamily'] == "Database Instance":
        region = regions[product['attributes']['location']]
        rds_instances[region].push(product['attributes'])

# write output to file
with open(output_file, 'w') as outfile:
    json.dump(rds_instances, outfile)
