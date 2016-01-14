#!/usr/bin/env python
import requests
import json

output_file = './www/rds.json'
# price_index = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/index.json'
# index = requests.get(price_index)
# data = index.json()
with open('/Users/svdgraaf/Downloads/rds.json') as json_data:
    data = json.load(json_data)

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

# ondemand pricing
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
    '3yr All Upfront': 'yrTerm3.partialUpfront',
    '1yr All Upfront': 'yrTerm1.partialUpfront',
    '1yr No Upfront': 'yrTerm1.noUpfront',
}

# reserved pricing
for sku, offers in data['terms']['Reserved'].iteritems():
    for code, offer in offers.iteritems():
        for key, dimension in offer['priceDimensions'].iteritems():

            # skip these for now
            if any(descr in dimension['description'].lower() for descr in ['transfer', 'global', 'storage', 'iops', 'requests']):
                continue

            instance = rds_instances[sku]
            region = rds_instances[sku]['region']

            if region not in instances[instance['instance_type']]['pricing']:
                instances[instance['instance_type']]['pricing'][region] = {}

            if 'reserved' not in instances[instance['instance_type']]['pricing'][region][instance['database_engine']]:
                instances[instance['instance_type']]['pricing'][region][instance['database_engine']]['reserved'] = {}

            reserved_type = "%s %s" % (offer['termAttributes']['LeaseContractLength'], offer['termAttributes']['PurchaseOption'])
            instances[instance['instance_type']]['pricing'][region][instance['database_engine']]['reserved'][reserved_mapping[reserved_type]] = float(dimension['pricePerUnit']['USD'])

            # rds_instances[sku]['pricing'][rds_instances[sku]['region']] = {
            #     'foo': {
            #         'ondemand': float(dimension['pricePerUnit']['USD'])
            #     }
            # }
            #
            # "yrTerm1.noUpfront": "0.094",
            # "yrTerm3.allUpfront": "0.0623",
            # "yrTerm1.allUpfront": "0.0783",
            # "yrTerm1.partialUpfront": "0.08",
            # "yrTerm3.partialUpfront": "0.0663"

# write output to file
with open(output_file, 'w') as outfile:
    json.dump(instances.values(), outfile)
