#!/usr/bin/env python
import requests
import json
from json import encoder
import sys
import botocore
import botocore.exceptions
import boto3
import pickle
import re

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


service_pretty_name_map = {
    "Processing": "Processing",
    "Training": "Training",
    "Hosting": "Hosting",
    "Notebook": "Notebook Instances",
    "AsyncInf": "Asynchronous Inference",
    "BatchTransform": "Batch Transform",
    "RStudio:RSession": "RStudio",
    "RStudio:RServer": "RStudio",
    "RStudio:RSessionGateway": "RStudio",
    "Studio-Notebook": "Studio Notebooks",
    "TensorBoard": "TensorBoard",
    "Processing_DW": "Data Wrangler Processing",
    "Studio": "Data Wrangler Interactive",
    "SpotTraining": "Spot Training",
    "Cluster": "HyperPod",
    "Cluster-Reserved": "HyperPod",
    "Studio-JupyterLab": "JupyterLab",
    "studio-codeeditor": "Code Editor",
}


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
            attributes["vCPU"] = attributes["vCpu"]
            attributes["physical_processor"] = attributes["physicalCpu"]
            if attributes["physicalGpu"] == "N/A":
                attributes["GPU"] = 0
            else:
                attributes["GPU"] = attributes["physicalGpu"]
            attributes["GPU_memory"] = attributes["gpuMemory"]
            if attributes["GPU_memory"] == "N/A":
                attributes["GPU_memory"] = 0
            elif "hbm" in attributes["GPU_memory"].lower():
                attributes["GPU_memory"] = int(attributes["GPU_memory"].split(" ")[0])
            else:
                attributes["GPU_memory"] = int(attributes["GPU_memory"])
            attributes["arch"] = attributes.get("processorArchitecture", None)
            attributes["memory"] = float(attributes["memory"].split(" ")[0])
            attributes["clock_speed_ghz"] = attributes.get("clockSpeed", "N/A")
            attributes["network_performance"] = attributes.get(
                "networkPerformance", None
            )
            attributes["instance_type"] = instance_type
            if attributes["platoinstancetype"] == "Processing_Geo":
                # https://aws.amazon.com/sagemaker/geospatial/pricing/ is only availble in Oregon
                # and is simply an additional charge on top of instance usage
                continue
            elif "Free" in attributes["platoinstancetype"]:
                continue
            attributes["component"] = service_pretty_name_map[
                attributes["platoinstancetype"]
            ]
            if "computeType" in attributes:
                # some skus don't have this. Unclear why
                attributes["family"] = attributes["computeType"]
            if "currentGeneration" in attributes:
                if attributes["currentGeneration"] == "yes":
                    attributes["generation"] = "current"
                else:
                    attributes["generation"] = "previous"
            attributes["pricing"] = {}
            attributes["pricing"][region] = {}

            ml_instances[sku] = attributes

            if instance_type not in instances.keys():
                # delete some attributes that are inconsistent among skus
                new_attributes = (
                    attributes.copy()
                )  # make copy so we can keep these attributes with the sku
                new_attributes.pop("location", None)
                new_attributes.pop("regionCode", None)
                new_attributes.pop("vCpu", None)
                new_attributes.pop("locationType", None)
                new_attributes.pop("region", None)
                new_attributes.pop("networkPerformance", None)
                new_attributes.pop("processorArchitecture", None)
                new_attributes.pop("servicename", None)
                new_attributes.pop("servicecode", None)
                new_attributes.pop("usagetype", None)
                new_attributes.pop("instanceType", None)
                new_attributes.pop("physicalCpu", None)
                new_attributes.pop("physicalGpu", None)
                new_attributes.pop("clockSpeed", None)
                new_attributes.pop("computeType", None)
                new_attributes.pop("gpu", None)
                new_attributes.pop("gpuMemory", None)
                new_attributes.pop("platoinstancetype", None)
                new_attributes.pop("platoinstancename", None)
                new_attributes.pop("currentGeneration", None)
                new_attributes.pop("operation", None)
                new_attributes.pop("processing", None)

                new_attributes["pricing"] = attributes["pricing"]
                new_attributes["regions"] = {}

                instances[instance_type] = new_attributes
            else:
                # hardware details are inconsistent between some SKUs
                if attributes["vCPU"] != "N/A":
                    instances[instance_type]["vCPU"] = attributes["vCPU"]
                if attributes["GPU"] != 0:
                    instances[instance_type]["GPU"] = attributes["GPU"]
                if attributes["GPU_memory"] != "N/A":
                    instances[instance_type]["GPU_memory"] = attributes["GPU_memory"]

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
                    "ondemand": float(dimension["pricePerUnit"]["USD"]),
                    "usage": instance["usagetype"],
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
    with open("sagemaker.pickle", "wb") as file:
        pickle.dump(instances, file)

    # write output to file
    encoder.FLOAT_REPR = lambda o: format(o, ".5f")
    with open(output_file, "w+") as outfile:
        json.dump(list(instances.values()), outfile, indent=1)


def parse_savings_plans():
    with open("sagemaker.pickle", "rb") as file:
        instances = pickle.load(file)

    # download this json file
    # /savingsPlan/v1.0/aws/AWSMachineLearningSavingsPlans/current/region_index.json
    price_index = "https://pricing.us-east-1.amazonaws.com/savingsPlan/v1.0/aws/AWSMachineLearningSavingsPlans/current/region_index.json"
    index = requests.get(price_index)
    data = index.json()

    # Iterate through all regions and download the json file at versionUrl
    # "regions" : [ {
    #   "regionCode" : "af-south-1",
    #   "versionUrl" : "/savingsPlan/v1.0/aws/AWSMachineLearningSavingsPlans/20231027160516/af-south-1/index.json"
    # }, {
    for region in data["regions"]:
        print(region["regionCode"])
        print(region["versionUrl"])

        base = "https://pricing.us-east-1.amazonaws.com"
        price_index = base + region["versionUrl"]
        index = requests.get(price_index)
        data = index.json()
        for sku in data["terms"]["savingsPlan"]:
            for rate in sku["rates"]:
                print(rate)
                pattern = r"\w+\.\w+\.\w+$"
                match = re.search(pattern, rate["discountedUsageType"])
                if not match:
                    print('ERROR: Could not find instance type in {}'.format(rate["discountedSku"]))
                this_instance = match.group()
                for i in instances:
                    if instances[i]["instance_type"] == this_instance:
                        for region, components in instances[i]["pricing"].items():
                            for component, value in components.items():
                                if rate["discountedUsageType"] == value["usage"]:
                                    # TODO: look up term of savings plan (1 yr, 3 yr)
                                    # TODO: add this term to the pricing dict
                                    # TODO: maybe unroll these for loops
                                    print('Found savings plan')
                                    print(value["usage"])
                                    print(rate["discountedUsageType"])
                print(this_instance)
            break
        break

    # parse the details of the savings plan
    # {
    #   "sku": "3YPXFW2FJXS3D9VM",
    #   "productFamily": "SageMakerSavingsPlans",
    #   "serviceCode": "MachineLearningSavingsPlans",
    #   "usageType": "SageMakerSP:1yrPartialUpfront",
    #   "operation": "",
    #   "attributes": {
    #     "purchaseOption": "Partial Upfront",
    #     "productFamily": "SageMakerSavingsPlans",
    #     "serviceCode": "MachineLearningSavingsPlans",
    #     "granularity": "hourly",
    #     "locationType": "AWS Region",
    #     "purchaseTerm": "1yr",
    #     "location": "Any",
    #     "detail": "1yrPartialUpfront",
    #     "usageType": "SageMakerSP:1yrPartialUpfront"
    #   }
    # },

    # parse through each SP for each instance and line up the discount with the instance
    # "terms": {
    #   "savingsPlan": [
    #     {
    #       "sku": "3YPXFW2FJXS3D9VM",
    #       "description": "1 year Partial Upfront SageMaker Savings Plan",
    #       "effectiveDate": "2023-10-27T16:00:53Z",
    #       "leaseContractLength": {
    #         "duration": 1,
    #         "unit": "year"
    #       },
    #       "rates": [
    #         {
    #           "discountedSku": "25TC687A4JSSSY7E",
    #           "discountedUsageType": "USE1-Train:ml.m4.16xlarge",
    #           "discountedOperation": "RunInstance",
    #           "discountedServiceCode": "AmazonSageMaker",
    #           "rateCode": "3YPXFW2FJXS3D9VM.25TC687A4JSSSY7E",
    #           "unit": "Hrs",
    #           "discountedRate": {
    #             "price": "2.60544",
    #             "currency": "USD"
    #           }
    #         },


def add_spot_pricing():
    pass


if __name__ == "__main__":
    parse_savings_plans()
    sys.exit(1)

    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]

    output_file = "./www/sagemaker/instances.json"
    scrape(output_file, input_file)
