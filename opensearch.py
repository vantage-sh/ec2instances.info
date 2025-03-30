#!/usr/bin/env python
import requests
import json
from json import encoder
import sys
from lxml import etree
from six.moves.urllib import request as urllib2

import six
from tqdm import tqdm

import ec2


def add_pretty_names(instances):
    family_names = {
        "t2": "T2 General Purpose",
        "t3": "T3 General Purpose",
        "m3": "M3 General Purpose",
        "m4": "M4 General Purpose",
        "m5": "M5 General Purpose",
        "m6g": "M6G General Purpose",
        "c4": "C4 Compute Optimized",
        "c5": "C5 Compute Optimized",
        "c6g": "C6G Compute Optimized",
        "r3": "R3 Memory Optimized",
        "r4": "R4 Memory Optimized",
        "r5": "R5 Memory Optimized",
        "r6g": "R6G Memory Optimized",
        "r6gd": "R6GD Memory Optimized (NVME SSD)",
        "i2": "I2 Storage Optimized",
        "i3": "I3 Storage Optimized",
    }

    for k in instances:
        i = instances[k]
        # instance type format looks like "dc1.large"
        pieces = i["instance_type"].split(".")
        family = pieces[0]
        short = pieces[1]
        prefix = family_names.get(family, family.upper())
        extra = None
        if short.startswith("2x"):
            extra = "Double"
        elif short.startswith("4x"):
            extra = "Quadruple"
        if short.startswith("8x"):
            extra = "Eight"
        if short.startswith("10x"):
            extra = "Deca"
        elif short.startswith("12x"):
            extra = "12xlarge"
        elif short.startswith("16x"):
            extra = "16xlarge"
        elif short.startswith("x"):
            extra = ""
        bits = [prefix]
        if extra is not None:
            bits.extend([extra, "Extra"])
            short = "Large"

        bits.append(short.capitalize())

        i["pretty_name"] = " ".join([b for b in bits if b])


def add_volume_quotas(instances):
    os_quotas_url = "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html"
    tree = etree.parse(urllib2.urlopen(os_quotas_url), etree.HTMLParser())
    table = tree.xpath('//div[@class="table-contents disable-scroll"]//table')[1]
    rows = table.xpath(".//tr[./td]")

    for r in rows:
        # .lower() as keys were coming back with odd capitalization.
        instance_type = etree.tostring(r[0], method="text").strip().decode().lower()
        min_ebs = etree.tostring(r[1], method="text").strip().decode()
        max_ebs_gp2 = etree.tostring(r[2], method="text").strip().decode()
        max_ebs_gp3 = etree.tostring(r[3], method="text").strip().decode()

        if instance_type in instances:
            instances[instance_type]["min_ebs"] = min_ebs
            instances[instance_type]["max_ebs_gp2"] = max_ebs_gp2
            instances[instance_type]["max_ebs_gp3"] = max_ebs_gp3

    table = tree.xpath('//div[@class="table-contents disable-scroll"]//table')[2]
    rows = table.xpath(".//tr[./td]")
    for r in rows:
        instance_type = etree.tostring(r[0], method="text").strip().decode()
        max_http_payload = etree.tostring(r[1], method="text").strip().decode()

        if instance_type in instances:
            instances[instance_type]["max_http_payload"] = max_http_payload

    # Manually add ultrawarm storage
    instances["ultrawarm1.medium.search"]["max_storage"] = "1.5 TiB"
    instances["ultrawarm1.large.search"]["max_storage"] = "20 TiB"


def scrape(output_file, input_file=None):
    # if an argument is given, use that as the path for the json file
    if input_file:
        with open(input_file) as json_data:
            data = json.load(json_data)
    else:
        price_index = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonES/current/index.json"
        index = requests.get(price_index)
        data = index.json()

    caches_instances = {}
    instances = {}

    # region mapping, someone thought it was handy not to include the region id's :(
    regions = ec2.get_region_descriptions()

    # loop through products, and only fetch available instances for now
    for sku, product in tqdm(six.iteritems(data["products"])):
        if (
            product.get("productFamily", None) == "Amazon OpenSearch Service Instance"
            and product.get("attributes", {}).get("operation", None)
            != "DirectQueryAmazonS3GDCOCU"
        ):

            attributes = product.get("attributes", {})
            if "instanceType" not in attributes:
                continue

            instance_type = attributes["instanceType"]

            # map the region
            location = ec2.canonicalize_location(attributes["location"])
            if location == "Any":
                region = "us-east-1"
            elif location == "Asia Pacific (Osaka-Local)":
                # at one point this region was local but was upgraded to a standard region
                # however some SKUs still reference the old region
                region = "ap-northeast-3"
                regions[location] = region
            elif location not in regions.values():
                region = attributes["regionCode"]
                regions[location] = region
            else:
                region = regions[location]

            # set the attributes in line with the ec2 index
            attributes["region"] = region
            attributes["memory"] = attributes["memoryGib"].split(" ")[0]
            attributes["family"] = attributes["instanceFamily"]
            attributes["instance_type"] = instance_type
            attributes["pricing"] = {}
            attributes["pricing"][region] = {}

            caches_instances[sku] = attributes

            if instance_type not in instances.keys():
                # delete some attributes that are inconsistent among skus
                new_attributes = (
                    attributes.copy()
                )  # make copy so we can keep these attributes with the sku
                new_attributes.pop("location", None)
                new_attributes.pop("locationType", None)
                new_attributes.pop("operation", None)
                new_attributes.pop("region", None)
                new_attributes.pop("usagetype", None)
                new_attributes["pricing"] = attributes["pricing"]
                new_attributes["regions"] = {}

                instances[instance_type] = new_attributes

    # Parse ondemand pricing
    for sku, offers in six.iteritems(data["terms"]["OnDemand"]):
        for code, offer in six.iteritems(offers):
            for key, dimension in six.iteritems(offer["priceDimensions"]):
                # skip these types of charges
                if any(
                    descr in dimension["description"].lower()
                    for descr in [
                        "transfer",
                        "global",
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

                if region not in instances[instance_type]["pricing"]:
                    # Initialise pricing for the instance_type
                    instances[instance_type]["pricing"][region] = {}

                instances[instance_type]["pricing"][region] = {
                    "ondemand": float(dimension["pricePerUnit"]["USD"])
                }

                # build the list of regions where each instance is available
                # we have to do a reverse lookup from the regions list
                l = ""
                for l, r in regions.items():
                    if instance["region"] == r:
                        location = l
                        break
                instances[instance["instance_type"]]["regions"][instance["region"]] = l

    reserved_mapping = {
        "1yr All Upfront": "yrTerm1.allUpfront",
        "1yr Partial Upfront": "yrTerm1.partialUpfront",
        "1yr No Upfront": "yrTerm1.noUpfront",
        "3yr All Upfront": "yrTerm3.allUpfront",
        "3yr Partial Upfront": "yrTerm3.partialUpfront",
        "3yr No Upfront": "yrTerm3.noUpfront",
    }

    # Parse reserved pricing
    for sku, offers in six.iteritems(data["terms"]["Reserved"]):
        for code, offer in six.iteritems(offers):
            for key, dimension in six.iteritems(offer["priceDimensions"]):
                # print()
                # print()

                instance = caches_instances.get(sku)
                if not instance:
                    print(
                        f"WARNING: Received reserved pricing info for unknown sku={sku}"
                    )
                    continue

                region = instance["region"]
                instance_type = instance["instance_type"]

                # create a regional hash
                if region not in instance["pricing"]:
                    instance["pricing"][region] = {}

                # create a reserved hash
                if "reserved" not in instances[instance_type]["pricing"][region]:
                    instances[instance_type]["pricing"][region]["reserved"] = {}

                reserved_type = f"%s %s" % (
                    offer["termAttributes"]["LeaseContractLength"],
                    offer["termAttributes"]["PurchaseOption"],
                )

                instances[instance_type]["pricing"][region]["reserved"][
                    "%s-%s"
                    % (reserved_mapping[reserved_type], dimension["unit"].lower())
                ] = float(dimension["pricePerUnit"]["USD"])

    # Calculate all reserved effective pricings (upfront hourly + hourly price)
    # Since Light, Medium and Heavy utilization are from previous generations and are not available for choosing
    # anymore in AWS console, we are not calculating it

    for instance_type, instance in six.iteritems(instances):
        for region, pricing in six.iteritems(instance["pricing"]):
            for engine, prices in six.iteritems(pricing):
                if "reserved" not in engine:
                    continue
                try:
                    # no multi-az here
                    reserved_prices = {}

                    if "yrTerm3.partialUpfront-quantity" in prices:
                        reserved_prices["yrTerm3Standard.partialUpfront"] = (
                            prices["yrTerm3.partialUpfront-quantity"] / (365 * 3) / 24
                        ) + prices["yrTerm3.partialUpfront-hrs"]

                    if "yrTerm1.partialUpfront-quantity" in prices:
                        reserved_prices["yrTerm1Standard.partialUpfront"] = (
                            prices["yrTerm1.partialUpfront-quantity"] / 365 / 24
                        ) + prices["yrTerm1.partialUpfront-hrs"]

                    if "yrTerm3.allUpfront-quantity" in prices:
                        reserved_prices["yrTerm3Standard.allUpfront"] = (
                            prices["yrTerm3.allUpfront-quantity"] / (365 * 3) / 24
                        ) + prices["yrTerm3.allUpfront-hrs"]

                    if "yrTerm1.allUpfront-quantity" in prices:
                        reserved_prices["yrTerm1Standard.allUpfront"] = (
                            prices["yrTerm1.allUpfront-quantity"] / 365 / 24
                        ) + prices["yrTerm1.allUpfront-hrs"]

                    if "yrTerm1.noUpfront-hrs" in prices:
                        reserved_prices["yrTerm1Standard.noUpfront"] = prices[
                            "yrTerm1.noUpfront-hrs"
                        ]

                    if "yrTerm3.noUpfront-hrs" in prices:
                        reserved_prices["yrTerm3Standard.noUpfront"] = prices[
                            "yrTerm3.noUpfront-hrs"
                        ]

                    instances[instance_type]["pricing"][region][
                        "reserved"
                    ] = reserved_prices
                except Exception as e:
                    print(
                        "ERROR: Trouble generating Cache reserved price for {}: {!r}".format(
                            instance_type, e
                        )
                    )

    add_pretty_names(instances)
    add_volume_quotas(instances)

    # write output to file
    encoder.FLOAT_REPR = lambda o: format(o, ".5f")
    with open(output_file, "w+") as outfile:
        json.dump(list(instances.values()), outfile, indent=1)


if __name__ == "__main__":
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]

    output_file = "./www/opensearch/instances.json"
    scrape(output_file, input_file)
