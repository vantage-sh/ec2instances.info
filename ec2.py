import json
import locale
import re
import traceback
from datetime import datetime

import boto3
import botocore
import botocore.exceptions
from pkg_resources import resource_filename

import scrape


def canonicalize_location(location, from_pricing_api=True):
    """Ensure location aligns with one of the options returned by get_region_descriptions()"""
    # The pricing API returns locations with the old EU prefix
    if not from_pricing_api:
        return re.sub("^Europe", "EU", location)
    return re.sub("^EU", "Europe", location)


# Translate between the API and what is used locally
def translate_platform_name(operating_system, preinstalled_software):
    os = {
        "Linux": "linux",
        "RHEL": "rhel",
        "Red Hat Enterprise Linux with HA": "rhel",
        "SUSE": "sles",
        "Windows": "mswin",
        "Ubuntu Pro": "ubuntu",
        # Spot products
        "Linux/UNIX": "linux",
        "Red Hat Enterprise Linux": "rhel",
        "Red Hat Enterprise Linux (Amazon VPC)": "rhel",
        "SUSE Linux": "sles",
    }
    software = {
        "NA": "",
        "SQL Std": "SQL",
        "SQL Web": "SQLWeb",
        "SQL Ent": "SQLEnterprise",
    }
    platform = os.get(operating_system, "unknown") + software.get(
        preinstalled_software, "unknown"
    )
    if "unknown" in platform:
        print(f"WARNING: Unknown platform: {operating_system}, {preinstalled_software}")
    return platform


# Translate between the API and what is used locally
def translate_reserved_terms(term_attributes):
    lease_contract_length = term_attributes.get("LeaseContractLength")
    purchase_option = term_attributes.get("PurchaseOption")
    offering_class = term_attributes.get("OfferingClass")
    leases = {"1yr": "yrTerm1", "3yr": "yrTerm3"}
    options = {
        "All Upfront": "allUpfront",
        "Partial Upfront": "partialUpfront",
        "No Upfront": "noUpfront",
    }
    return (
        leases[lease_contract_length]
        + str(offering_class).capitalize()
        + "."
        + options[purchase_option]
    )


# The pricing API requires human readable names for some reason
def get_region_descriptions():
    result = {}
    # Source: https://github.com/boto/botocore/blob/develop/botocore/data/endpoints.json
    endpoint_file = resource_filename("botocore", "data/endpoints.json")
    with open(endpoint_file, "r") as f:
        endpoints = json.load(f)
        for partition in endpoints["partitions"]:
            for region in partition["regions"]:
                # Skip secret and Chinese regions
                if "us-iso" not in region and not region.startswith("cn-"):
                    result[partition["regions"][region]["description"]] = region
    return result


def get_instances():
    instance_types = {}
    try:
        ec2_client = boto3.client("ec2", region_name="us-east-1")
        ec2_pager = ec2_client.get_paginator("describe_instance_types")
        instance_type_iterator = ec2_pager.paginate()
        for result in instance_type_iterator:
            for instance_type in result["InstanceTypes"]:
                instance_types[instance_type["InstanceType"]] = instance_type
    except botocore.exceptions.ClientError as e:
        print(
            f"ERROR: Failure listing EC2 instance types. See README for proper IAM permissions.\n{e}"
        )
        raise e

    instances = {}
    pricing_client = boto3.client("pricing", region_name="us-east-1")
    product_pager = pricing_client.get_paginator("get_products")

    # Not all instances are in US-EAST-1 any longer.
    # Check Ohio, California, and Oregon as well.
    for region in [
        "US East (Ohio)",
        "US East (N. Virginia)",
        "US West (N. California)",
        "US West (Oregon)",
    ]:
        product_iterator = product_pager.paginate(
            ServiceCode="AmazonEC2",
            Filters=[
                {
                    "Type": "TERM_MATCH",
                    "Field": "location",
                    "Value": region,
                }
            ],
        )
        for product_item in product_iterator:
            for offer_string in product_item.get("PriceList"):
                offer = json.loads(offer_string)
                product = offer.get("product")

                # Check if it's an instance
                if product.get("productFamily") not in [
                    "Compute Instance",
                    "Compute Instance (bare metal)",
                    "Dedicated Host",
                ]:
                    continue

                product_attributes = product.get("attributes")
                instance_type = product_attributes.get("instanceType")

                if instance_type in ["u-6tb1", "u-9tb1", "u-12tb1"]:
                    # API returns the name without the .metal suffix
                    instance_type = instance_type + ".metal"

                if instance_type in instances:
                    continue

                new_inst = parse_instance(
                    instance_type, product_attributes, instance_types.get(instance_type)
                )

                # Some instanced may be dedicated hosts instead
                if new_inst is not None:
                    instances[instance_type] = new_inst

    print(f"Found data for instance types: {', '.join(sorted(instances.keys()))}")
    return list(instances.values())


def add_pricing(imap):
    descriptions = get_region_descriptions()
    pricing_client = boto3.client("pricing", region_name="us-east-1")
    product_pager = pricing_client.get_paginator("get_products")

    product_iterator = product_pager.paginate(
        ServiceCode="AmazonEC2",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "capacityStatus", "Value": "Used"},
            {"Type": "TERM_MATCH", "Field": "tenancy", "Value": "Shared"},
            {
                "Type": "TERM_MATCH",
                "Field": "licenseModel",
                "Value": "No License required",
            },
        ],
    )
    for product_item in product_iterator:
        for offer_string in product_item.get("PriceList"):
            offer = json.loads(offer_string)
            product = offer.get("product")
            product_attributes = product.get("attributes")
            instance_type = product_attributes.get("instanceType")
            location = canonicalize_location(product_attributes.get("location"))

            # Add regions local zones and wavelength zones on the fly as we find them
            if location not in descriptions:
                descriptions[location] = product_attributes.get("regionCode")

            region = descriptions[location]

            # Skip Chinese regions because they generate incorrect pricing data
            if region.startswith("cn-"):
                continue

            terms = offer.get("terms")

            operating_system = product_attributes.get("operatingSystem")
            preinstalled_software = product_attributes.get("preInstalledSw")
            platform = translate_platform_name(operating_system, preinstalled_software)

            if instance_type not in imap:
                print(
                    f"WARNING: Ignoring pricing - unknown instance type. instance={instance_type}, location={location}"
                )
                continue

            # If the instance type is not in us-east-1 imap[instance_type] could fail
            try:
                inst = imap[instance_type]
                inst.pricing.setdefault(region, {})
                inst.regions[region] = location
                inst.pricing[region].setdefault(platform, {})
                inst.pricing[region][platform]["ondemand"] = get_ondemand_pricing(terms)
                # Some instances don't offer reserved terms at all
                reserved = get_reserved_pricing(terms)
                if reserved:
                    inst.pricing[region][platform]["reserved"] = reserved
            except Exception as e:
                # print more details about the instance for debugging
                print(f"ERROR: Exception adding pricing for {instance_type}: {e}")
                print(traceback.print_exc())
    add_spot_pricing(imap)


def format_price(price):
    return str(float("%f" % float(price))).rstrip("0").rstrip(".")


def get_ondemand_pricing(terms):
    ondemand_terms = terms.get("OnDemand", {})
    price = 0.0
    # There should be only one ondemand_term and one price_dimension
    for ondemand_term in ondemand_terms.keys():
        price_dimensions = ondemand_terms.get(ondemand_term).get("priceDimensions")
        for price_dimension in price_dimensions.keys():
            price = price_dimensions.get(price_dimension).get("pricePerUnit").get("USD")
    if not price:
        # print(f"WARNING: No USD price found")
        return 0.0
    return format_price(price)


def get_reserved_pricing(terms):
    pricing = {}
    reserved_terms = terms.get("Reserved", {})
    for reserved_term in reserved_terms.keys():
        term_attributes = reserved_terms.get(reserved_term).get("termAttributes")
        price_dimensions = reserved_terms.get(reserved_term).get("priceDimensions")
        # No Upfront instances don't have price dimension for upfront price
        upfront_price = 0.0
        price_per_hour = 0.0
        for price_dimension in price_dimensions.keys():
            temp_price = (
                price_dimensions.get(price_dimension).get("pricePerUnit").get("USD")
            )
            if not temp_price:
                # print(f"WARNING: No USD reserved price found")
                continue
            if price_dimensions.get(price_dimension).get("unit") == "Hrs":
                price_per_hour = temp_price
            else:
                upfront_price = temp_price
        local_term = translate_reserved_terms(term_attributes)
        lease_in_years = term_attributes.get("LeaseContractLength")[0]
        hours_in_term = int(lease_in_years[0]) * 365 * 24
        price = float(price_per_hour) + (float(upfront_price) / hours_in_term)
        pricing[local_term] = format_price(price)
    return pricing


def add_spot_pricing(imap):
    instance_types = list(imap.keys())

    for region in get_region_descriptions().values():
        # Skip the new EU Sovereign Cloud region that causes timeout issues
        # TODO: Remove this when the region is available: https://ec2.eusc-de-east-1.amazonaws.eu/
        # Initially introduced in: https://github.com/boto/botocore/commit/24cb96eda38a3867c1dc9ceb412133d1df11bd20
        if region.startswith("eusc-"):
            print(f"INFO: Skipping EU Sovereign Cloud region: {region}")
            continue

        try:
            # get all spot price data from a region
            ec2_client = boto3.client("ec2", region_name=region)
            prices_pager = ec2_client.get_paginator("describe_spot_price_history")
            prices_iterator = prices_pager.paginate(
                InstanceTypes=instance_types, StartTime=datetime.now()
            )
            # populate spot prices into the instance data
            for p in prices_iterator:
                prices = p["SpotPriceHistory"]
                for price in prices:
                    inst = imap[price["InstanceType"]]
                    platform = translate_platform_name(
                        price["ProductDescription"], "NA"
                    )
                    region = price["AvailabilityZone"][0:-1]
                    if region in inst.pricing:
                        inst.pricing[region].setdefault(platform, {})
                        inst.pricing[region][platform].setdefault("spot", [])
                        inst.pricing[region][platform].setdefault("spot_min", "N/A")
                        inst.pricing[region][platform].setdefault("spot_max", "N/A")
                        inst.pricing[region][platform]["spot"].append(
                            price["SpotPrice"]
                        )
                        inst.pricing[region][platform]["spot"].sort(key=float)
                        inst.pricing[region][platform]["spot_min"] = inst.pricing[
                            region
                        ][platform]["spot"][0]
                        inst.pricing[region][platform]["spot_max"] = inst.pricing[
                            region
                        ][platform]["spot"][-1]
                    else:
                        # In rare cases (occuring for the first time in July 2022), instances
                        # can be available in a region as spots but not on demand or any other
                        # way. In that case, the logic above will fail and we need to wrap it
                        # in a conditional and create the region first to put spot prices in
                        # If more edge cases: print(json.dumps(inst.to_dict(), indent=4))
                        inst.pricing[region] = {
                            platform: {
                                "spot": [price["SpotPrice"]],
                                "spot_min": price["SpotPrice"],
                                "spot_max": price["SpotPrice"],
                            }
                        }

        except (
            botocore.exceptions.ClientError,
            botocore.exceptions.EndpointConnectionError,
        ):
            print(
                'WARNING: Spot region "{}" not enabled. Falling back to spot advisor.'.format(
                    region
                )
            )
            pass


def parse_instance(instance_type, product_attributes, api_description):
    pieces = instance_type.split(".")
    if len(pieces) == 1:
        # Dedicated host that is not u-*.metal, skipping
        # May be a good idea to all dedicated hosts in the future
        return

    i = scrape.Instance()
    i.api_description = api_description
    i.instance_type = instance_type

    i.family = product_attributes.get("instanceFamily")

    i.vCPU = locale.atoi(product_attributes.get("vcpu"))

    # Memory is given in form of "1,952 GiB", let's parse it
    # Memory is 'NA' for u-*.metal instances
    if i.instance_type == "u-6tb1.metal":
        i.memory = 6144.0
    elif i.instance_type == "u-9tb1.metal":
        i.memory = 9216.0
    elif i.instance_type == "u-12tb1.metal":
        i.memory = 12288.0
    else:
        i.memory = locale.atof(product_attributes.get("memory").split(" ")[0])

    if api_description:
        i.arch = api_description["ProcessorInfo"]["SupportedArchitectures"]

        i.network_performance = api_description["NetworkInfo"]["NetworkPerformance"]
    else:
        if "AWS Graviton" in product_attributes.get("physicalProcessor"):
            # If we don't have too much info but it has "AWS Graviton" in the physicalProcessor,
            # we can assume it's arm64.
            i.arch.append("arm64")
        else:
            # Assume x86_64 if there's no DescribeInstanceTypes data.
            i.arch.append("x86_64")
            if "32-bit" in product_attributes.get("processorArchitecture"):
                i.arch.append("i386")

        i.network_performance = product_attributes.get("networkPerformance")

    if product_attributes.get("currentGeneration") == "Yes":
        i.generation = "current"
    else:
        i.generation = "previous"

    gpu = product_attributes.get("gpu")
    if gpu is not None:
        i.GPU = locale.atoi(gpu)
    if "inf" in instance_type or "trn" in instance_type:
        i.GPU = 1

    if api_description:
        if "FpgaInfo" in api_description:
            for fpga in api_description["FpgaInfo"]["Fpgas"]:
                i.FPGA += fpga["Count"]

        netinfo = api_description["NetworkInfo"]
        if netinfo["EnaSupport"] == "required":
            i.ebs_as_nvme = True

        i.vpc = {
            "max_enis": netinfo["MaximumNetworkInterfaces"],
            "ips_per_eni": netinfo["Ipv4AddressesPerInterface"],
        }

    if api_description:
        if "EbsInfo" in api_description:
            if "EbsOptimizedInfo" in api_description["EbsInfo"]:
                ebs_optimized_info = api_description["EbsInfo"]["EbsOptimizedInfo"]
                i.ebs_optimized = True
                i.ebs_baseline_throughput = ebs_optimized_info[
                    "BaselineThroughputInMBps"
                ]
                i.ebs_baseline_iops = ebs_optimized_info["BaselineIops"]
                i.ebs_baseline_bandwidth = ebs_optimized_info["BaselineBandwidthInMbps"]
                i.ebs_throughput = ebs_optimized_info["MaximumThroughputInMBps"]
                i.ebs_iops = ebs_optimized_info["MaximumIops"]
                i.ebs_max_bandwidth = ebs_optimized_info["MaximumBandwidthInMbps"]

    try:
        ecu = product_attributes.get("ecu")
        if ecu == "Variable":
            i.ECU = "variable"
        else:
            i.ECU = locale.atof(ecu)
    except:
        pass

    i.physical_processor = product_attributes.get("physicalProcessor")

    # CPU features
    processor_features = product_attributes.get("processorFeatures")
    if processor_features is not None:
        if "Intel AVX512" in processor_features:
            i.intel_avx512 = True
        if "Intel AVX2" in processor_features:
            i.intel_avx2 = True
        if "Intel AVX" in processor_features:
            i.intel_avx = True
        if "Intel Turbo" in processor_features:
            i.intel_turbo = True

    i.clock_speed_ghz = product_attributes.get("clockSpeed")

    if i.generation == "current" and instance_type[0:2] != "t2":
        i.enhanced_networking = True

    return i


def describe_regions():
    ec2_client = boto3.client("ec2", region_name="us-east-1")
    response = ec2_client.describe_regions(AllRegions=True)
    for region in response["Regions"]:
        yield region["RegionName"]


def describe_instance_type_offerings(region_name="us-east-1", location_type="region"):
    """
    location_type = 'region' | 'availability-zone' | 'availability-zone-id'
    """
    try:
        ec2_client = boto3.client("ec2", region_name=region_name)
        paginator = ec2_client.get_paginator("describe_instance_type_offerings")
        page_iterator = paginator.paginate(LocationType=location_type)
        filtered_iterator = page_iterator.search("InstanceTypeOfferings")
        for offering in filtered_iterator:
            yield offering
    except botocore.exceptions.ClientError:
        pass


if __name__ == "__main__":
    get_region_descriptions()
