import boto3
import locale
import json
from pkg_resources import resource_filename


# Translate between the API and what is used locally
def translate_platform_name(operating_system, preinstalled_software):
    os = {'Linux': 'linux',
          'RHEL': 'rhel',
          'SUSE': 'sles',
          'Windows': 'mswin'}
    software = {'NA': '',
          'SQL Std': 'SQL',
          'SQL Web': 'SQLWeb',
          'SQL Ent': 'SQLEnterprise'}
    return os[operating_system] + software[preinstalled_software]


# Translate between the API and what is used locally
def translate_reserved_terms(term_attributes):
    lease_contract_length = term_attributes.get('LeaseContractLength')
    purchase_option = term_attributes.get('PurchaseOption')
    offering_class = term_attributes.get('OfferingClass')
    leases = {'1yr': 'yrTerm1',
              '3yr': 'yrTerm3'}
    options = {'All Upfront': 'allUpfront',
               'Partial Upfront': 'partialUpfront',
               'No Upfront': 'noUpfront'}
    return leases[lease_contract_length] + str(offering_class).capitalize() + '.' + options[purchase_option]


# The pricing API requires human readable names for some reason
def get_region_descriptions():
    result = dict()
    endpoint_file = resource_filename('botocore', 'data/endpoints.json')
    with open(endpoint_file, 'r') as f:
        endpoints = json.load(f)
        for partition in endpoints['partitions']:
            for region in partition['regions']:
                result[partition['regions'][region]['description']] = region
    # The Osaka region is special and is not on the list of endpoints in boto3
    result['Asia Pacific (Osaka-Local)'] = 'ap-northeast-3'
    return result


def add_pricing(imap):
    descriptions = get_region_descriptions()
    pricing_client = boto3.client('pricing', region_name='us-east-1')
    product_pager = pricing_client.get_paginator('get_products')

    product_iterator = product_pager.paginate(
         ServiceCode='AmazonEC2', Filters=[
            {'Type': 'TERM_MATCH', 'Field': 'capacityStatus', 'Value': 'Used'},
            {'Type': 'TERM_MATCH', 'Field': 'tenancy', 'Value': 'Shared'},
            {'Type': 'TERM_MATCH', 'Field': 'licenseModel', 'Value': 'No License required'},
            ])
    for product_item in product_iterator:
        for offer_string in product_item.get('PriceList'):
            offer = json.loads(offer_string)
            product = offer.get('product')
            product_attributes = product.get('attributes')

            location = product_attributes.get('location')
            region = descriptions[location]
            terms = offer.get('terms')

            operating_system = product_attributes.get('operatingSystem')
            preinstalled_software = product_attributes.get('preInstalledSw')
            platform = translate_platform_name(operating_system, preinstalled_software)

            instance_type = product_attributes.get('instanceType')
            inst = imap[instance_type]

            inst.pricing.setdefault(region, {})
            inst.pricing[region].setdefault(platform, {})
            inst.pricing[region][platform]['ondemand'] = get_ondemand_pricing(terms)
            # Some instances don't offer reserved terms at all
            reserved = get_reserved_pricing(terms)
            if reserved:
                inst.pricing[region][platform]['reserved'] = reserved

            # ECU was gathered in previous pricing function so we should include it here
            ecu = product_attributes.get('ecu')
            try:
                if ecu == 'Variable':
                    inst.ECU = 'variable'
                else:
                    inst.ECU = locale.atof(ecu)
            except:
                pass


def format_price(price):
    return str(float("%f" % float(price))).rstrip('0').rstrip('.')


def get_ondemand_pricing(terms):
    ondemand_terms = terms.get('OnDemand', {})
    price = 0.0
    # There should be only one ondemand_term and one price_dimension
    for ondemand_term in ondemand_terms.keys():
        price_dimensions = ondemand_terms.get(ondemand_term).get('priceDimensions')
        for price_dimension in price_dimensions.keys():
            price = price_dimensions.get(price_dimension).get('pricePerUnit').get('USD')
    return format_price(price)


def get_reserved_pricing(terms):
    pricing = {}
    reserved_terms = terms.get('Reserved', {})
    for reserved_term in reserved_terms.keys():
        term_attributes = reserved_terms.get(reserved_term).get('termAttributes')
        price_dimensions = reserved_terms.get(reserved_term).get('priceDimensions')
        # No Upfront instances don't have price dimension for upfront price
        upfront_price = 0.0
        price_per_hour = 0.0
        for price_dimension in price_dimensions.keys():
            temp_price = price_dimensions.get(price_dimension).get('pricePerUnit').get('USD')
            if price_dimensions.get(price_dimension).get('unit') == 'Hrs':
                price_per_hour = temp_price
            else:
                upfront_price = temp_price
        local_term = translate_reserved_terms(term_attributes)
        lease_in_years = term_attributes.get('LeaseContractLength')[0]
        hours_in_term = int(lease_in_years[0]) * 365 * 24
        price = float(price_per_hour) + (float(upfront_price)/hours_in_term)
        pricing[local_term] = format_price(price)
    return pricing
