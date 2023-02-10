#!/usr/bin/env python
import requests
import json
from json import encoder
import sys
import botocore
import botocore.exceptions
import boto3

import six
from tqdm import tqdm

import ec2


def add_pretty_names(instances):
    family_names = {
        "t4g": "T4g General Purpose Graviton",
        "t3": "T3 General Purpose",
        "t2": "T2 General Purpose",
        "t1": "T1 Previous generation: (not recommended)",
        "m6g": "M6g General Purpose Graviton",
        "m5": "M5 General Purpose",
        "m4": "M4 General Purpose",
        "m3": "M3 Previous generation: (not recommended)",
        "m2": "M2 General Purpose",
        "m1": "M1 Previous generation: (not recommended)",
        "r6gd": "R6gd Memory optimized (SSD storage)",
        "r6g": "R6g Memory optimized",
        "r5": "R5 Memory optimized",
        "r4": "R4 Memory optimized",
        "r3": "R3 Memory optimized (not recommended)",
        "c1": "C1 Compute optimized (not recommended)",
    }

    for k in instances:
        i = instances[k]
        # instance type format looks like "db.r4.large"; dropping the "db" prefix
        pieces = i["instance_type"].split(".")
        family = pieces[1]
        short = pieces[2]
        prefix = family_names.get(family, family.upper())
        extra = None
        if short.startswith("8x"):
            extra = "Eight"
        elif short.startswith("4x"):
            extra = "Quadruple"
        elif short.startswith("2x"):
            extra = "Double"
        elif short.startswith("10x"):
            extra = "Deca"
        elif short.startswith("x"):
            extra = ""
        bits = [prefix]
        if extra is not None:
            bits.extend([extra, "Extra"])
            short = "Large"

        bits.append(short.capitalize())

        i["pretty_name"] = " ".join([b for b in bits if b])


def scrape(output_file, input_file=None):
    # if an argument is given, use that as the path for the json file
    if input_file:
        with open(input_file) as json_data:
            data = json.load(json_data)
    else:
        price_index = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonElastiCache/current/index.json"
        index = requests.get(price_index)
        data = index.json()

    caches_instances = {}
    instances = {}

    # region mapping, someone thought it was handy not to include the region id's :(
    regions = ec2.get_region_descriptions()

    # loop through products, and only fetch available instances for now
    for sku, product in tqdm(six.iteritems(data["products"])):
        if product.get("productFamily", None) == "Cache Instance":
            attributes = product["attributes"]

            # map the region
            location = ec2.canonicalize_location(attributes["location"])
            instance_type = attributes["instanceType"]
            try:
                region = regions[location]
            except KeyError as e:
                if location == "Any":
                    region = "us-east-1"
                else:
                    print(
                        f"WARNING: No region data for location={location}. Ignoring instance with sku={sku}, type={instance_type}"
                    )
                    continue

            # Fix https://github.com/vantage-sh/ec2instances.info/issues/644 - Outpost pricing overwriting reserved
            loctype = attributes["locationType"]
            if "Outposts" in loctype:
                print(
                    f"WARNING: Skipping location type={loctype} for instance with sku={sku}, type={instance_type}"
                )
                continue

            # set the attributes in line with the ec2 index
            attributes["region"] = region
            attributes["memory"] = attributes["memory"].split(" ")[0]
            attributes["network_performance"] = attributes.get(
                "networkPerformance", None
            )
            attributes["family"] = attributes["instanceFamily"]
            attributes["instance_type"] = instance_type
            attributes["cache_engine"] = attributes["cacheEngine"]
            attributes["pricing"] = {}
            attributes["pricing"][region] = {}

            caches_instances[sku] = attributes

            if instance_type not in instances.keys():
                # delete some attributes that are inconsistent among skus
                new_attributes = (
                    attributes.copy()
                )  # make copy so we can keep these attributes with the sku
                new_attributes.pop("cache_engine", None)
                new_attributes.pop("location", None)
                new_attributes.pop("locationType", None)
                new_attributes.pop("operation", None)
                new_attributes.pop("region", None)
                new_attributes.pop("usagetype", None)
                new_attributes["pricing"] = attributes["pricing"]

                instances[instance_type] = new_attributes

    # Parse ondemand pricing
    for sku, offers in six.iteritems(data["terms"]["OnDemand"]):
        for code, offer in six.iteritems(offers):
            for key, dimension in six.iteritems(offer["priceDimensions"]):

                # skip these for now
                if any(
                    descr in dimension["description"].lower()
                    for descr in [
                        "transfer",
                        "global",
                        "storage",
                        "iops",
                        "requests",
                        "multi-az",
                    ]
                ):
                    continue

                instance = caches_instances.get(sku)
                if not instance:
                    # print(f"WARNING: Received on demand pricing info for unknown sku={sku}")
                    continue

                region = instance["region"]
                instance_type = instance["instance_type"]
                cache_engine = instance["cache_engine"]

                if region not in instances[instance_type]["pricing"]:
                    # Initialise pricing for the instance_type
                    instances[instance_type]["pricing"][region] = {}

                instances[instance_type]["pricing"][region][cache_engine] = {
                    "ondemand": float(dimension["pricePerUnit"]["USD"])
                }

    reserved_mapping = {
        "1yr All Upfront": "yrTerm1.allUpfront",
        "1yr Partial Upfront": "yrTerm1.partialUpfront",
        "1yr No Upfront": "yrTerm1.noUpfront",
        "1yr Light Utilization": "yrTerm1.lightUtilization",
        "1yr Medium Utilization": "yrTerm1.mediumUtilization",
        "1yr Heavy Utilization": "yrTerm1.heavyUtilization",
        "3yr All Upfront": "yrTerm3.allUpfront",
        "3yr Partial Upfront": "yrTerm3.partialUpfront",
        "3yr No Upfront": "yrTerm3.noUpfront",
        "3yr Light Utilization": "yrTerm3.lightUtilization",
        "3yr Medium Utilization": "yrTerm3.mediumUtilization",
        "3yr Heavy Utilization": "yrTerm3.heavyUtilization",
    }

    # Parse reserved pricing
    for sku, offers in six.iteritems(data["terms"]["Reserved"]):
        for code, offer in six.iteritems(offers):
            for key, dimension in six.iteritems(offer["priceDimensions"]):

                instance = caches_instances.get(sku)
                if not instance:
                    # print(f"WARNING: Received reserved pricing info for unknown sku={sku}")
                    continue

                region = instance["region"]
                instance_type = instance["instance_type"]
                cache_engine = instance["cache_engine"]

                # create a regional hash
                if region not in instance["pricing"]:
                    instance["pricing"][region] = {}

                # create a cache_engine hash
                if cache_engine not in instance["pricing"][region]:
                    instance["pricing"][region][instance["cache_engine"]] = {}

                # create a reserved hash
                if (
                    "reserved"
                    not in instances[instance_type]["pricing"][region][cache_engine]
                ):
                    instances[instance_type]["pricing"][region][cache_engine][
                        "reserved"
                    ] = {}

                reserved_type = f"%s %s" % (
                    offer["termAttributes"]["LeaseContractLength"],
                    offer["termAttributes"]["PurchaseOption"],
                )

                instances[instance_type]["pricing"][region][cache_engine]["reserved"][
                    "%s-%s"
                    % (reserved_mapping[reserved_type], dimension["unit"].lower())
                ] = float(dimension["pricePerUnit"]["USD"])

    # Calculate all reserved effective pricings (upfront hourly + hourly price)
    # Since Light, Medium and Heavy utilization are from previous generations and are not available for choosing
    # anymore in AWS console, we are not calculating it
    for instance_type, instance in six.iteritems(instances):
        for region, pricing in six.iteritems(instance["pricing"]):
            for engine, prices in six.iteritems(pricing):
                if "reserved" not in prices:
                    continue
                try:
                    # no multi-az here
                    reserved_prices = {}

                    if "yrTerm3.partialUpfront-quantity" in prices["reserved"]:
                        reserved_prices["yrTerm3Standard.partialUpfront"] = (
                            prices["reserved"]["yrTerm3.partialUpfront-quantity"]
                            / (365 * 3)
                            / 24
                        ) + prices["reserved"]["yrTerm3.partialUpfront-hrs"]

                    if "yrTerm1.partialUpfront-quantity" in prices["reserved"]:
                        reserved_prices["yrTerm1Standard.partialUpfront"] = (
                            prices["reserved"]["yrTerm1.partialUpfront-quantity"]
                            / 365
                            / 24
                        ) + prices["reserved"]["yrTerm1.partialUpfront-hrs"]

                    if "yrTerm3.allUpfront-quantity" in prices["reserved"]:
                        reserved_prices["yrTerm3Standard.allUpfront"] = (
                            prices["reserved"]["yrTerm3.allUpfront-quantity"]
                            / (365 * 3)
                            / 24
                        ) + prices["reserved"]["yrTerm3.allUpfront-hrs"]

                    if "yrTerm1.allUpfront-quantity" in prices:
                        reserved_prices["yrTerm1Standard.allUpfront"] = (
                            prices["yrTerm1.allUpfront-quantity"] / 365 / 24
                        ) + prices["yrTerm1.allUpfront-hrs"]

                    if "yrTerm1.noUpfront-hrs" in prices["reserved"]:
                        reserved_prices["yrTerm1Standard.noUpfront"] = prices[
                            "reserved"
                        ]["yrTerm1.noUpfront-hrs"]

                    if "yrTerm3.noUpfront-hrs" in prices["reserved"]:
                        reserved_prices["yrTerm3Standard.noUpfront"] = prices[
                            "reserved"
                        ]["yrTerm3.noUpfront-hrs"]

                    instances[instance_type]["pricing"][region][engine][
                        "reserved"
                    ] = reserved_prices
                except Exception as e:
                    print(
                        "ERROR: Trouble generating Cache reserved price for {}: {!r}".format(
                            instance_type, e
                        )
                    )

    add_pretty_names(instances)
    add_cache_parameters(instances)
    add_max_clients(instances)

    # write output to file
    encoder.FLOAT_REPR = lambda o: format(o, ".5f")
    with open(output_file, "w+") as outfile:
        json.dump(list(instances.values()), outfile, indent=1)


def add_max_clients(instances):
    low_max_clients = [
        "cache.t2.micro",
        "cache.t2.small",
        "cache.t2.medium",
        "cache.t3.micro",
        "cache.t4g.micro",
    ]

    for i in instances.keys():
        if instances[i]["instance_type"] in low_max_clients:
            instances[i]["max_clients"] = "20000"
        else:
            instances[i]["max_clients"] = "65000"


def add_cache_parameters(instances):
    """
    Valid values are: memcached1.4 | memcached1.5 | memcached1.6 | redis2.6 | redis2.8 | redis3.2 | redis4.0 | redis5.0 | redis6.x | redis6.2

    There are many parameters available for Memcached and Redis. For detail pages we're just interested in the ones that are different per instance

    https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/ParameterGroups.Memcached.html

    https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ParameterGroups.Redis.html

    Custom parameters are:
    Memcached:
    - max cache memory
    - num threads
    Redis:
    - max memory
    - client output buffer limit
    - max clients
    - current generation
    """

    iparams = {}

    for param_fam in [
        "memcached1.6",
        "redis6.x",
    ]:
        cache_client = boto3.client("elasticache", region_name="us-east-1")
        response = cache_client.describe_engine_default_parameters(
            CacheParameterGroupFamily=param_fam,
        )

        per_instance_params = response["EngineDefaults"][
            "CacheNodeTypeSpecificParameters"
        ]

        for param_family in per_instance_params:
            param_name = param_family["ParameterName"]
            params_sets = param_family["CacheNodeTypeSpecificValues"]

            for param in params_sets:
                itype = param["CacheNodeType"]
                if itype not in iparams:
                    iparams[itype] = {}

                os_param = "".join([param_fam, "-", param_name])
                iparams[itype][os_param] = param["Value"]

    for i in instances.keys():
        try:
            instances[i].update(iparams[i])
        except KeyError:
            print("No cache parameters for {}".format(i))


if __name__ == "__main__":
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]

    output_file = "./www/cache/instances.json"
    scrape(output_file, input_file)
