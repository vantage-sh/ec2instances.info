#!/usr/bin/env python
import requests
import json
from json import encoder
import sys


output_file = './www/rds.json'

# if an argument is given, use that as the path for the json file
if len(sys.argv) > 1:
    with open(sys.argv[1]) as json_data:
        data = json.load(json_data)
else:
    price_index = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/index.json'
    index = requests.get(price_index)
    data = index.json()

rds_instances = {}
instances = {}

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
for sku, product in data['products'].iteritems():

    if product['productFamily'] == 'Database Instance':
        # map the region
        region = regions[product['attributes']['location']]

        # set the attributes in line with the ec2 index
        attributes = product['attributes']
        attributes['region'] = region
        attributes['memory'] = attributes['memory'].split(' ')[0]
        attributes['network_performance'] = attributes['networkPerformance']
        attributes['family'] = attributes['instanceFamily']
        attributes['instance_type'] = attributes['instanceType']
        attributes['database_engine'] = attributes['databaseEngine']
        attributes['arch'] = attributes['processorArchitecture']
        attributes['pricing'] = {}
        attributes['pricing'][region] = {}
        rds_instances[sku] = attributes

        if attributes['instance_type'] not in instances.keys():
            instances[attributes['instance_type']] = attributes
            instances[attributes['instance_type']]['pricing'] = {}

# Parse ondemand pricing
for sku, offers in data['terms']['OnDemand'].iteritems():
    for code, offer in offers.iteritems():
        for key, dimension in offer['priceDimensions'].iteritems():

            # skip these for now
            if any(descr in dimension['description'].lower() for descr in ['transfer', 'global', 'storage', 'iops', 'requests']):
                continue

            instance = rds_instances[sku]
            if instance['region'] not in instances[instance['instance_type']]['pricing']:
                instances[instance['instance_type']]['pricing'][instance['region']] = {}

            instances[instance['instance_type']]['pricing'][instance['region']][instance['database_engine']] = {
                'ondemand': float(dimension['pricePerUnit']['USD'])
            }

reserved_mapping = {
    '3yr Partial Upfront': 'yrTerm3.partialUpfront',
    '1yr Partial Upfront': 'yrTerm1.partialUpfront',
    '3yr All Upfront': 'yrTerm3.allUpfront',
    '1yr All Upfront': 'yrTerm1.allUpfront',
    '1yr No Upfront': 'yrTerm1.noUpfront',
}

# Parse reserved pricing
for sku, offers in data['terms']['Reserved'].iteritems():
    for code, offer in offers.iteritems():
        for key, dimension in offer['priceDimensions'].iteritems():

            instance = rds_instances[sku]
            region = rds_instances[sku]['region']

            # create a regional hash
            if region not in instances[instance['instance_type']]['pricing']:
                instances[instance['instance_type']]['pricing'][region] = {}

            # create a reserved hash
            if 'reserved' not in instances[instance['instance_type']]['pricing'][region][instance['database_engine']]:
                instances[instance['instance_type']]['pricing'][region][instance['database_engine']]['reserved'] = {}

            # store the pricing in placeholder field
            reserved_type = "%s %s" % (offer['termAttributes']['LeaseContractLength'], offer['termAttributes']['PurchaseOption'])
            instances[instance['instance_type']]['pricing'][region][instance['database_engine']]['reserved']['%s-%s' % (reserved_mapping[reserved_type], dimension['unit'].lower())] = float(dimension['pricePerUnit']['USD'])

            # if instance['instance_type'] == 'db.m3.medium' and region == 'eu-west-1': # and instance['database_engine'].lower() == 'mariadb':
            #     print offer
            #     print instance['database_engine']
            #     print dimension
            #     print reserved_type
            #     print dimension['pricePerUnit']['USD'], float(dimension['pricePerUnit']['USD'])
            #     print instances[instance['instance_type']]['pricing'][region][instance['database_engine']]['reserved']

# Calculate all reserved effective pricings (upfront hourly + hourly price)
for instance_type, instance in instances.iteritems():
    for region, pricing in instance['pricing'].iteritems():
        for engine, prices in pricing.iteritems():
            if 'reserved' in prices:
                reserved_prices = {
                    'yrTerm3.partialUpfront': (prices['reserved']['yrTerm3.partialUpfront-quantity'] / 365 / 24) + prices['reserved']['yrTerm3.partialUpfront-hrs'],
                    'yrTerm1.partialUpfront': (prices['reserved']['yrTerm1.partialUpfront-quantity'] / 365 / 24) + prices['reserved']['yrTerm1.partialUpfront-hrs'],
                    'yrTerm3.allUpfront': (prices['reserved']['yrTerm3.allUpfront-quantity'] / 365 / 24) + prices['reserved']['yrTerm3.allUpfront-hrs'],
                    'yrTerm1.allUpfront': (prices['reserved']['yrTerm1.allUpfront-quantity'] / 365 / 24) + prices['reserved']['yrTerm1.allUpfront-hrs'],
                    'yrTerm1.noUpfront': prices['reserved']['yrTerm1.noUpfront-hrs'],
                }
                instances[instance_type]['pricing'][region][engine]['reserved'] = reserved_prices

# print json.dumps(instances['db.m3.medium']['pricing']['eu-west-1'], indent=4)

# write output to file
encoder.FLOAT_REPR = lambda o: format(o, '.5f')
with open(output_file, 'w') as outfile:
    json.dump(instances.values(), outfile, indent=4)
