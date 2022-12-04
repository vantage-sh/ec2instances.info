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
        "dc2": "Dense Compute DC2",
        "ra3": "Managed Storage",
        "dc1": "Dense Compute",
        "ds1": "Dense Storage",
        "ds2": "Dense Storage DS2",
    }

    for k in instances:
        i = instances[k]
        # instance type format looks like "dc1.large"
        pieces = i["instance_type"].split(".")
        family = pieces[0]
        short = pieces[1]
        prefix = family_names.get(family, family.upper())
        extra = None
        if short.startswith("8x"):
            extra = "Eight"
        elif short.startswith("4x"):
            extra = "Quadruple"
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


def add_node_parameters(instances):
    cluster_url = (
        "https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html"
    )
    tree = etree.parse(urllib2.urlopen(cluster_url), etree.HTMLParser())

    for table_cnt in [0, 1, 2]:
        table = tree.xpath('//div[@class="table-contents"]//table')[table_cnt]
        rows = table.xpath(".//tr[./td]")

        for r in rows:
            etree.strip_elements(r, "sup")
            instance_type = etree.tounicode(r[0], method="text").strip()
            slices = etree.tounicode(r[3], method="text").strip()
            per_node_storage = etree.tounicode(r[4], method="text").strip()
            node_range = etree.tounicode(r[5], method="text").strip()
            storage_cap = etree.tounicode(r[6], method="text").strip()

            if "single-node" in instance_type:
                instance_type = "ra3.xlplus"
            elif "multi-node" in instance_type:
                instances["ra3.xlplus"][
                    "multi-node_storage_per_node"
                ] = per_node_storage
                instances["ra3.xlplus"]["multi-node_node_range"] = node_range
                instances["ra3.xlplus"]["multi-node_storage_capacity"] = storage_cap
                continue

            instances[instance_type]["slices_per_node"] = slices
            instances[instance_type]["storage_per_node"] = per_node_storage
            instances[instance_type]["node_range"] = node_range
            instances[instance_type]["storage_capacity"] = storage_cap


def scrape(output_file, input_file=None):
    # if an argument is given, use that as the path for the json file
    if input_file:
        with open(input_file) as json_data:
            data = json.load(json_data)
    else:
        price_index = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRedshift/current/index.json"
        index = requests.get(price_index)
        data = index.json()

    caches_instances = {}
    instances = {}

    # region mapping, someone thought it was handy not to include the region id's :(
    regions = ec2.get_region_descriptions()

    # loop through products, and only fetch available instances for now
    for sku, product in tqdm(six.iteritems(data["products"])):
        if product.get("productFamily", None) == "Compute Instance":
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
                        f"ERROR: No region data for location={location}. Ignoring instance with sku={sku}, type={instance_type}"
                    )
                    continue

            # set the attributes in line with the ec2 index
            attributes["region"] = region
            attributes["memory"] = attributes["memory"].split(" ")[0]
            attributes["family"] = attributes["usageFamily"]
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
    add_node_parameters(instances)

    # write output to file
    encoder.FLOAT_REPR = lambda o: format(o, ".5f")
    with open(output_file, "w+") as outfile:
        json.dump(list(instances.values()), outfile, indent=1)


if __name__ == "__main__":
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]

    output_file = "./www/redshift/instances.json"
    scrape(output_file, input_file)
