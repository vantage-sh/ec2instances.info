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
        price_index = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonSageMaker/current/index.json"
        index = requests.get(price_index)
        data = index.json()

    ml_instances = {}
    instances = {}

    regions = ec2.get_region_descriptions()

    # loop through products, and only fetch available instances for now
    for sku, product in tqdm(six.iteritems(data["products"])):
        if product.get("productFamily", None) == "ML Instance":
            attributes = product["attributes"]

            # map the region
            location = ec2.canonicalize_location(attributes["location"])
            print(attributes)
            instance_type = attributes["instanceType"].split("-")[0]
            if instance_type == "NA":
                instance_type = attributes["usagetype"].split(":")[1]

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
            attributes["instance_type"] = instance_type
            attributes["component"] = attributes["platoinstancetype"]
            attributes["pricing"] = {}
            attributes["pricing"][region] = {}

            ml_instances[sku] = attributes

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

                instance = ml_instances.get(sku)
                if not instance:
                    # print(f"WARNING: Received on demand pricing info for unknown sku={sku}")
                    continue

                region = instance["region"]
                instance_type = instance["instance_type"]
                component = instance["component"]

                if region not in instances[instance_type]["pricing"]:
                    # Initialise pricing for the instance_type
                    instances[instance_type]["pricing"][region] = {}

                instances[instance_type]["pricing"][region][component] = {
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

    add_pretty_names(instances)

    # write output to file
    encoder.FLOAT_REPR = lambda o: format(o, ".5f")
    with open(output_file, "w+") as outfile:
        json.dump(list(instances.values()), outfile, indent=1)


if __name__ == "__main__":
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]

    output_file = "./www/sagemaker/instances.json"
    scrape(output_file, input_file)
