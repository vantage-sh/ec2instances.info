#!/usr/bin/env python
import requests
import json
from json import encoder
import sys


def add_pretty_names(instances):
    family_names = {
        't2': 'T2 General Purpose',
        'r3': 'R3 Memory Optimized',
        'r4': 'R4 Memory Optimized',
        'c3': 'C3 High-CPU',
        'c4': 'C4 High-CPU',
        'm3': 'M3 General Purpose',
        'i3': 'I3 High I/O',
        'cg1': 'Cluster GPU',
        'cc2': 'Cluster Compute',
        'cr1': 'High Memory Cluster',
        'hs1': 'High Storage',
        'c1' : 'C1 High-CPU',
        'hi1': 'HI1. High I/O',
        'm2' : 'M2 High Memory',
        'm1' : 'M1 General Purpose',
        'm4' : 'M4 General Purpose'
        }
    for k in instances:
        i = instances[k]
        # instance type format looks like "db.r4.large"; dropping the "db" prefix
        pieces = i['instance_type'].split('.')
        family = pieces[1]
        short  = pieces[2]
        prefix = family_names.get(family, family.upper())
        extra = None
        if short.startswith('8x'):
            extra = 'Eight'
        elif short.startswith('4x'):
            extra = 'Quadruple'
        elif short.startswith('2x'):
            extra = 'Double'
        elif short.startswith('10x'):
            extra = 'Deca'
        elif short.startswith('x'):
            extra = ''
        bits = [prefix]
        if extra is not None:
            bits.extend([extra, 'Extra'])
            short = 'Large'

        bits.append(short.capitalize())

        i['pretty_name'] = ' '.join([b for b in bits if b])


def scrape(output_file, input_file=None):
    # if an argument is given, use that as the path for the json file
    if input_file:
        with open(input_file) as json_data:
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
        "Asia Pacific (Mumbai)": 'ap-south-1',
        "Asia Pacific (Seoul)": 'ap-northeast-2',
        "Asia Pacific (Singapore)": 'ap-southeast-1',
        "Asia Pacific (Sydney)": 'ap-southeast-2',
        "Asia Pacific (Tokyo)": 'ap-northeast-1',
        "Asia Pacific (Osaka-Local)": 'ap-northeast-3',
        "Canada (Central)": 'ca-central-1',
        "EU (Frankfurt)": 'eu-central-1',
        "EU (Ireland)": 'eu-west-1',
        "EU (London)": 'eu-west-2',
        "EU (Paris)": 'eu-west-3',
        "South America (Sao Paulo)": 'sa-east-1',
        "US East (N. Virginia)": 'us-east-1',
        "US East (Ohio)": 'us-east-2',
        "US West (N. California)": 'us-west-1',
        "US West (Oregon)": 'us-west-2',
    }

    # loop through products, and only fetch available instances for now
    for sku, product in data['products'].iteritems():

        if product.get('productFamily', None) == 'Database Instance':
            # map the region
            try:
                region = regions[product['attributes']['location']]
            except KeyError as e:
                if product['attributes']['location'] == 'Any':
                    region = 'us-east-1'
                else:
                    raise

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
                if any(descr in dimension['description'].lower() for descr in ['transfer', 'global', 'storage', 'iops', 'requests', 'multi-az']):
                    continue

                instance = rds_instances.get(sku)
                if not instance:
                    print("ERROR: Instance type not found for sku={}".format(sku))
                    continue

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
        '1yr No Upfront': 'yrTerm1.noUpfront'
    }

    # Parse reserved pricing
    for sku, offers in data['terms']['Reserved'].iteritems():
        for code, offer in offers.iteritems():
            for key, dimension in offer['priceDimensions'].iteritems():

                # skip multi-az
                if rds_instances[sku]['deploymentOption'] != 'Single-AZ':
                    continue

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

                # if instance['instance_type'] == 'db.m3.medium' and region == 'eu-west-1' and instance['database_engine'].lower() == 'mysql':
                #     print offer
                #     print instance['database_engine']
                #     print dimension
                #     print reserved_type
                #     print dimension['pricePerUnit']['USD'], float(dimension['pricePerUnit']['USD'])
                #     print instances[instance['instance_type']]['pricing'][region][instance['database_engine']]['reserved']

    # print json.dumps(instances['db.m3.medium']['pricing']['eu-west-1']['MySQL'], indent=4)

    # Calculate all reserved effective pricings (upfront hourly + hourly price)
    for instance_type, instance in instances.iteritems():
        for region, pricing in instance['pricing'].iteritems():
            for engine, prices in pricing.iteritems():
                if 'reserved' not in prices:
                    continue
                try:
                    # no multi-az here
                    reserved_prices = {
                        'yrTerm3.partialUpfront': (prices['reserved']['yrTerm3.partialUpfront-quantity'] / (365 * 3) / 24) + prices['reserved']['yrTerm3.partialUpfront-hrs'],
                        'yrTerm1.partialUpfront': (prices['reserved']['yrTerm1.partialUpfront-quantity'] / 365 / 24) + prices['reserved']['yrTerm1.partialUpfront-hrs'],
                        'yrTerm3.allUpfront': (prices['reserved']['yrTerm3.allUpfront-quantity'] / (365 * 3) / 24) + prices['reserved']['yrTerm3.allUpfront-hrs'],
                        'yrTerm1.allUpfront': (prices['reserved']['yrTerm1.allUpfront-quantity'] / 365 / 24) + prices['reserved']['yrTerm1.allUpfront-hrs'],
                        'yrTerm1.noUpfront': prices['reserved']['yrTerm1.noUpfront-hrs'],
                    }
                    instances[instance_type]['pricing'][region][engine]['reserved'] = reserved_prices
                except Exception as e:
                    print("ERROR: Trouble generating RDS reserved price for {}: {!r}".format(instance_type, e))

    # print json.dumps(instances['db.m3.medium']['pricing']['eu-west-1']['MySQL'], indent=4)

    add_pretty_names(instances)

    # write output to file
    encoder.FLOAT_REPR = lambda o: format(o, '.5f')
    with open(output_file, 'w') as outfile:
        json.dump(instances.values(), outfile, indent=4)


if __name__ == '__main__':
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]

    output_file = './www/rds/instances.json'
    scrape(output_file, input_file)
