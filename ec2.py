import boto3
import locale
import json
from pkg_resources import resource_filename
import scrape


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
    # Source: https://github.com/boto/botocore/blob/develop/botocore/data/endpoints.json
    endpoint_file = resource_filename('botocore', 'data/endpoints.json')
    with open(endpoint_file, 'r') as f:
        endpoints = json.load(f)
        for partition in endpoints['partitions']:
            for region in partition['regions']:
                result[partition['regions'][region]['description']] = region

    # The Osaka region is invite only and not in boto's list: https://github.com/boto/botocore/issues/1423
    result['Asia Pacific (Osaka-Local)'] = 'ap-northeast-3'

    return result


def get_instances():
    # FPGA missing

    instances = {}
    pricing_client = boto3.client('pricing', region_name='us-east-1')
    product_pager = pricing_client.get_paginator('get_products')

    product_iterator = product_pager.paginate(
         ServiceCode='AmazonEC2', Filters=[
            # We're gonna assume N. Virginia has all the available types
            {'Type': 'TERM_MATCH', 'Field': 'location', 'Value': 'US East (N. Virginia)'},

        ]
    )
    for product_item in product_iterator:
        for offer_string in product_item.get('PriceList'):
            offer = json.loads(offer_string)
            product = offer.get('product')

            # Check if it's an instance
            if product.get('productFamily') not in ['Compute Instance', 'Compute Instance (bare metal)', 'Dedicated Host']:
                continue

            product_attributes = product.get('attributes')
            instance_type = product_attributes.get('instanceType')

            if instance_type in ['u-6tb1', 'u-9tb1', 'u-12tb1']:
                # API returns the name without the .metal suffix
                instance_type = instance_type + '.metal'

            if instance_type in instances:
                continue

            new_inst = parse_instance(instance_type, product_attributes)

            # Some instanced may be dedicated hosts instead
            if new_inst is not None:
                instances[instance_type] = new_inst

    print(f"Found data for instance types: {', '.join(sorted(instances.keys()))}")
    return list(instances.values())


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
            instance_type = product_attributes.get('instanceType')
            location = product_attributes.get('location')

            # There may be a slight delay in updating botocore with new regional endpoints, skip and inform
            if location not in descriptions:
                print(f"WARNING: Ignoring pricing for instance {instance_type} in {location}. Location is unknown.")
                continue

            region = descriptions[location]
            terms = offer.get('terms')

            operating_system = product_attributes.get('operatingSystem')
            preinstalled_software = product_attributes.get('preInstalledSw')
            platform = translate_platform_name(operating_system, preinstalled_software)

            if instance_type not in imap:
                print(f"WARNING: Ignoring pricing for unrecognized instance type {instance_type} in {region}")
                continue

            # If the instance type is not in us-east-1 imap[instance_type] could fail
            try:
                inst = imap[instance_type]
                inst.pricing.setdefault(region, {})
                inst.pricing[region].setdefault(platform, {})
                inst.pricing[region][platform]['ondemand'] = get_ondemand_pricing(terms)
                # Some instances don't offer reserved terms at all
                reserved = get_reserved_pricing(terms)
                if reserved:
                    inst.pricing[region][platform]['reserved'] = reserved
            except Exception as e:
                # print more details about the instance for debugging
                print(f"ERROR: Exception adding pricing for {instance_type}: {e}")


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


def parse_instance(instance_type, product_attributes):
    i = scrape.Instance()
    i.instance_type = instance_type

    pieces = instance_type.split('.')
    if len(pieces) == 1:
        # Dedicated host that is not u-*.metal, skipping
        # May be a good idea to all dedicated hosts in the future
        return

    i.family = product_attributes.get('instanceFamily')

    if '32-bit' in product_attributes.get('processorArchitecture'):
        i.arch.append('i386')

    i.vCPU = locale.atoi(product_attributes.get('vcpu'))

    # Memory is given in form of "1,952 GiB", let's parse it
    i.memory = locale.atof(product_attributes.get('memory').split(' ')[0])

    i.network_performance = product_attributes.get('networkPerformance')
    if product_attributes.get('currentGeneration') == 'Yes':
        i.generation = 'current'
    else:
        i.generation = 'previous'

    gpu = product_attributes.get('gpu')
    if gpu is not None:
        i.GPU = locale.atoi(gpu)

    try:
        ecu = product_attributes.get('ecu')
        if ecu == 'Variable':
            i.ECU = 'variable'
        else:
            i.ECU = locale.atof(ecu)
    except:
        pass

    i.physical_processor = product_attributes.get('physicalProcessor')

    # CPU features
    processor_features = product_attributes.get('processorFeatures')
    if processor_features is not None:
        if "Intel AVX512" in processor_features:
            i.intel_avx512 = True
        if "Intel AVX2" in processor_features:
            i.intel_avx2 = True
        if "Intel AVX" in processor_features:
            i.intel_avx = True
        if "Intel Turbo" in processor_features:
            i.intel_turbo = True

    i.clock_speed_ghz = product_attributes.get('clockSpeed')

    enhanced_networking = product_attributes.get('enhancedNetworkingSupported')
    if enhanced_networking is not  None and enhanced_networking == 'Yes':
        i.enhanced_networking = True

    return i
