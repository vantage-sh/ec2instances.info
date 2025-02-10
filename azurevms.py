#!/usr/bin/env python
import json
import math
import os

import requests
import yaml

import scrape


class AzureInstance(object):
    def __init__(self):
        self.ACU = 0
        self.accelerated_networking = False
        self.arch = []
        self.api_description = None
        self.availability_zones = {}
        self.cached_disk = 0
        self.capacity_support = False
        self.confidential = False
        self.devices = 0
        self.drive_size = None
        self.ephemeral_disk = None
        self.encryption = False
        self.hibernation = None
        self.hyperv_generations = None
        self.instance_type = ""
        self.iops = None
        self.low_priority = False
        self.max_write_disks = None
        self.memory = 0
        self.memory_maintenance = False
        self.network_interfaces = None
        self.num_drives = None
        self.nvme_ssd = False
        self.premium_io = False
        self.pretty_name_azure = ""
        self.rdma = False
        self.read_io = 0
        self.trusted_launch = None
        self.ultra_ssd = False
        self.uncached_disk = 0
        self.uncached_disk_io = 0
        self.vcpus_available = 0
        self.vcpus_percore = 0
        self.vm_deployment = None
        self.write_io = 0

    def get_type_prefix(self):
        """h1, i3, d2, etc"""
        return self.instance_type.split(".")[0]

    def to_dict(self):
        d = dict(
            instance_type=self.instance_type,
            pretty_name_azure=self.pretty_name_azure,
            accelerated_networking=self.accelerated_networking,
            ACU=self.ACU,
            arch=self.arch,
            availability_zones=self.availability_zones,
            cached_disk=self.cached_disk,
            capacity_support=self.capacity_support,
            confidential=self.confidential,
            encryption=self.encryption,
            hibernation=self.hibernation,
            hyperv_generations=self.hyperv_generations,
            iops=self.iops,
            low_priority=self.low_priority,
            memory_maintenance=self.memory_maintenance,
            premium_io=self.premium_io,
            rdma=self.rdma,
            read_io=self.read_io,
            trusted_launch=self.trusted_launch,
            ultra_ssd=self.ultra_ssd,
            uncached_disk=self.uncached_disk,
            uncached_disk_io=self.uncached_disk_io,
            vcpus_available=self.vcpus_available,
            vcpus_percore=self.vcpus_percore,
            vm_deployment=self.vm_deployment,
            write_io=self.write_io,
        )
        d["storage"] = dict(
            nvme_ssd=self.nvme_ssd,
            devices=self.num_drives,
            size=self.drive_size,
            max_write_disks=self.max_write_disks,
        )
        return d

    def __repr__(self):
        return "<Instance {}>".format(self.instance_type)


def split_pricing(i, info, region, os, price):
    if info["type"] == "Consumption":
        if "Spot" in info["meterName"]:
            i.pricing[region][os] = {"spot": price}
        else:
            i.pricing[region][os] = {"ondemand": price}
    elif info["type"] == "Reservation":
        if "reserved" not in i.pricing[region][os]:
            i.pricing[region][os]["reserved"] = {}
        if info["reservationTerm"] == "1 Year":
            i.pricing[region][os]["reserved"] = {"yrTerm1Standard.allUpfront": price}
        elif info["reservationTerm"] == "3 Years":
            i.pricing[region][os]["reserved"] = {"yrTerm3Standard.allUpfront": price}
    elif info["type"] == "DevTestConsumption":
        i.pricing[region][os] = {"devtest": price}


def parse_instance(i, info):
    # Old method to get pricing
    i.instance_type = info["armSkuName"]
    i.pretty_name = info["productName"]

    region = info["armRegionName"]
    price = info["retailPrice"]

    if region not in i.pricing:
        i.pricing[region] = {}

    if "Windows" in info["productName"]:
        split_pricing(i, info, region, "windows", price)
    else:
        split_pricing(i, info, region, "linux", price)


def return_bool(value):
    if value == "True":
        return True
    if value == "False":
        return False


def parse_specs(i, cap):
    for c in cap:
        # if c.name == 'MaxResourceVolumeMB':
        #     i.size = c.value
        if c.name == "OSVhdSizeMB":
            i.drive_size = int(c.value)
        elif c.name == "ACUs":
            i.ACU = int(c.value)
        elif c.name == "MemoryPreservingMaintenanceSupported":
            i.memory_maintenance = return_bool(c.value)
        elif c.name == "HyperVGenerations":
            i.hyperv_generations = c.value
        elif c.name == "MaxDataDiskCount":
            i.devices = int(c.value)
        elif c.name == "CpuArchitectureType":
            i.arch = [c.value]
        elif c.name == "LowPriorityCapable":
            i.low_priority = return_bool(c.value)
        elif c.name == "PremiumIO":
            i.premium_io = return_bool(c.value)
        elif c.name == "VMDeploymentTypes":
            i.vm_deployment = c.value
        elif c.name == "vCPUsAvailable":
            i.vcpus_available = int(c.value)
        elif c.name == "vCPUsPerCore":
            i.vcpus_percore = int(c.value)
        elif c.name == "CombinedTempDiskAndCachedIOPS":
            i.iops = int(c.value)
        elif c.name == "CombinedTempDiskAndCachedReadBytesPerSecond":
            i.read_io = math.floor(int(c.value) / 1000000)
        elif c.name == "CombinedTempDiskAndCachedWriteBytesPerSecond":
            i.write_io = math.floor(int(c.value) / 1000000)
        elif c.name == "CachedDiskBytes":
            i.cached_disk = math.floor(int(c.value) / 1073741824)
        elif c.name == "UncachedDiskIOPS":
            i.uncached_disk = int(c.value)
        elif c.name == "UncachedDiskBytesPerSecond":
            i.uncached_disk_io = math.floor(int(c.value) / 1000000)
        elif c.name == "EphemeralOSDiskSupported":
            i.ephemeral_disk = c.value
        elif c.name == "EncryptionAtHostSupported":
            i.encryption = return_bool(c.value)
        elif c.name == "CapacityReservationSupported":
            i.capacity_support = return_bool(c.value)
        elif c.name == "AcceleratedNetworkingEnabled":
            i.accelerated_networking = return_bool(c.value)
        elif c.name == "RdmaEnabled":
            i.rdma = return_bool(c.value)
        elif c.name == "MaxNetworkInterfaces":
            i.network_interfaces = c.value
        elif c.name == "UltraSSDAvailable":
            i.ultra_ssd = return_bool(c.value)
        elif c.name == "HibernationSupported":
            i.hibernation = return_bool(c.value)
        elif c.name == "TrustedLaunchDisabled":
            i.trusted_launch = return_bool(c.value)
        elif c.name == "ConfidentialComputingType":
            i.confidential = c.value
        elif c.name == "NvmeDiskSizeInMiB":
            i.nvme_ssd = c.value
        elif c.name == "MaxWriteAcceleratorDisksAllowed":
            i.max_write_disks = c.value
        else:
            print(
                "Found unexpected attribute {} for instance type {}".format(
                    c.name, i.instance_type
                )
            )


def azure_vm_specs():
    from azure.identity import DefaultAzureCredential
    from azure.mgmt.compute import ComputeManagementClient

    credential = DefaultAzureCredential()

    # Retrieve subscription ID from environment variable.
    subscription_id = os.environ["AZURE_SUBSCRIPTION_ID"]

    # Obtain the management object for resources.
    compute_client = ComputeManagementClient(credential, subscription_id)

    instances = {}
    skus_list = compute_client.resource_skus.list()
    i = 0
    for s in skus_list:
        if s.resource_type == "virtualMachines":
            matched_name = s.name.split("_")[1]
            version = s.name.split("_v")
            if len(version) > 1:
                version = "v" + version[1]
            else:
                version = ""

            inst_name = matched_name.lower() + version

            # print(s.name)
            # print(inst_name)

            if inst_name not in instances:
                instances[inst_name] = AzureInstance()
                instances[inst_name].instance_type = inst_name
                instances[inst_name].pretty_name_azure = s.name.replace("_", " ")
                parse_specs(instances[inst_name], s.capabilities)
            i += 1
    print("Went through {} SKUs".format(i))

    data_file = "www/azure/instances-specs.json"
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    with open(data_file, "w+") as f:
        json.dump(
            [i.to_dict() for i in instances.values()],
            f,
            indent=1,
            sort_keys=True,
            separators=(",", ": "),
        )

    return instances


def azure_prices(instances):
    missing_instances = []
    s = requests.Session()
    response = s.get(
        "https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual Machines'"
    ).json()
    next_page_url = response["NextPageLink"]
    i = 0
    while next_page_url:
        for pricing in response["Items"]:
            try:
                apiname = pricing["armSkuName"]
                parse_instance(instances[apiname], pricing)
            except KeyError:
                if pricing["armSkuName"] not in missing_instances:
                    missing_instances.append(pricing["armSkuName"])

        response = s.get(next_page_url).json()
        print(next_page_url)
        next_page_url = response["NextPageLink"]
        i += 1
        # if i > 50:
        #     break

    data_file = "www/azure/instances-specs.json"
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    with open(data_file, "w+") as f:
        json.dump(
            [i.to_dict() for i in instances.values()],
            f,
            indent=1,
            sort_keys=True,
            separators=(",", ": "),
        )
    # [print(json.dumps(inst.to_dict(), indent=4)) for inst in instances.values()]

    print("Don't have attributes for these instances when adding pricing")
    [print(i) for i in missing_instances]


oss = [
    "linux",
    "windows",
    # "red-hat",
    # "sles-basic",
]


def load_regions(region_list="meta/regions_azure2.yaml"):
    with open(region_list, "r") as f:
        aws_regions = yaml.safe_load(f)

    return [r for r in aws_regions]


def azure_prices2():
    from random import randint
    from time import sleep

    specs_url = "https://azure.microsoft.com/api/v3/pricing/virtual-machines/page/details/{}/?showLowPriorityOffers=true"
    prices_url = "https://azure.microsoft.com/api/v3/pricing/virtual-machines/page/{}/{}/?showLowPriorityOffers=true"

    s = requests.Session()

    for _os in oss:
        url = specs_url.format(_os)
        print("Fetching {}".format(url))
        response = s.get(url).json()

        file = "www/azure/{}.json".format(_os)
        print("Saving {}".format(file))
        with open(file, "w") as f:
            json.dump(response, f, indent=4)

        sleep(randint(1, 3))

    for _os in oss:
        for region in load_regions():
            url = prices_url.format(_os, region)
            print("Fetching {}".format(url))
            response = s.get(url).json()

            file = "www/azure/{}_{}.json".format(region, _os)
            print("Saving {}".format(file))
            with open(file, "w") as f:
                json.dump(response, f, indent=4)

            # Be respectful
            sleep(randint(1, 3))


class AzureInstance2(object):
    def __init__(self, instance_type):
        self.instance_type = instance_type
        self.family = ""
        self.category = ""
        self.vcpu = 0.0
        self.memory = 0.0
        self.size = 0
        self.pricing = {}
        self.availability_zones = {}
        self.GPU = "0"

    def to_dict(self):
        return vars(self)


def parse_instance2(i, info):
    i.pretty_name = info["instanceName"]
    i.family = info["series"]
    i.category = info["category"]
    i.vcpu = info["cores"]
    i.memory = info["ram"]
    try:
        i.size = info["diskSize"]
    except KeyError:
        pass

    try:
        i.GPU = info["gpu"]
    except KeyError:
        pass


def azure_specs():
    instances = {}

    for _os in oss:
        specs_file = "www/azure/{}.json".format(_os)

        with open(specs_file, "r") as f:
            instance_specs = json.load(f)
            for k, info in instance_specs["attributesByOffer"].items():
                instance_type = k.split("-")[1]
                if instance_type not in instances:
                    i = AzureInstance2(instance_type)
                    parse_instance2(i, info)
                    instances[instance_type] = i

            print(
                "Found {} {} instances".format(
                    len(instance_specs["attributesByOffer"].keys()), _os
                )
            )

    return instances


def add_pricing2(instances):
    d = {}
    d["basic"] = {
        "perhour": "basic",  # 0.032,
        "perhourspot": "basic-spot",  # 0.007731,
        # "perhourhybridbenefit": 0.023,
        # "perhourpaygoneyearsubscription": 0.05405,
        # "perhourpaygthreeyearsubscription": 0.0437,
        # "perhourspothybridbenefit": 0.003705
    }

    d["lowpriority"] = {
        "perhour": "lowpriority",  # 1.044,
        # "perhourhybridbenefit": 0.375,
        # "perhourpaygoneyearsubscription": 0.4371,
        # "perhourpaygthreeyearsubscription": 0.4164
    }

    d["standard"] = {
        "perhour": "ondemand",  # 2.61,
        "perhouroneyearreserved": "yrTerm1Standard.allUpfront",  # 1.84159
        "perhourthreeyearreserved": "yrTerm3Standard.allUpfront",  # 1.44806,
        "perunitoneyearsavings": "yrTerm1Savings.allUpfront",  # 2.00432,
        "perunitthreeyearsavings": "yrTerm3Savings.allUpfront",  # 1.62371,
        "perhourspot": "spot_min",  # 0.427518,
        "perhourhybridbenefit": "hybridbenefit",  # 1.874,
        "perhouroneyearreservedhybridbenefit": "yrTerm1Standard.hybridbenefit",  # 1.10559,
        "perhourthreeyearreservedhybridbenefit": "yrTerm3Standard.hybridbenefit",  # 0.71206,
        "perunitoneyearsavingshybridbenefit": "yrTerm3Savings.hybridbenefit",  # 1.26832,
        "perunitthreeyearsavingshybridbenefit": "yrTerm3Savings.hybridbenefit",  # 0.88771,
        "perhourpaygoneyearsubscription": "yrTerm1Standard.subscription",  # 1.9361,
        "perhourpaygthreeyearsubscription": "yrTerm3Standard.subscription",  # 1.9154,
        # "perhouroneyearreservedoneyearsubscription": 1.11241,
        # "perhouroneyearreservedthreeyearsubscription": 1.09171,
        # "perhourthreeyearreservedoneyearsubscription": 0.73856,
        # "perhourthreeyearreservedthreeyearsubscription": 0.71786,
        # "perhourspothybridbenefit": 0.306961
    }

    for _os in oss[0:2]:
        for region in load_regions():
            file = "www/azure/{}_{}.json".format(region, _os)

            with open(file, "r") as f:
                instance_pricing = json.load(f)

                for k, info in instance_pricing.items():
                    instance_type = k.split("-")[1]
                    try:
                        i = instances[instance_type]
                    except KeyError:
                        print(
                            "Instance {} from pricing file not found".format(
                                instance_type
                            )
                        )

                    # Skip if there is no pricing for this instance in this region and for this os
                    if not info:
                        continue

                    if "basic" in k:
                        if region not in i.pricing:
                            i.pricing[region] = {}

                        if _os not in i.pricing[region]:
                            i.pricing[region][_os] = {}

                        for k2, v in d["basic"].items():
                            try:
                                i.pricing[region][_os][v] = info[k2]
                            except KeyError:
                                # print("{} {} basic not found in {} pricing file".format(k, k2, region))
                                pass

                    elif "lowpriority" in k:
                        if region not in i.pricing:
                            i.pricing[region] = {}

                        if _os not in i.pricing[region]:
                            i.pricing[region][_os] = {}

                        for k2, v in d["lowpriority"].items():
                            try:
                                i.pricing[region][_os][v] = info[k2]
                            except KeyError:
                                # print("{} lowpriority {} not found in {} pricing file".format(k, k2, region))
                                pass

                    elif "standard" in k:
                        if region not in i.pricing:
                            i.pricing[region] = {}

                        if _os not in i.pricing[region]:
                            i.pricing[region][_os] = {}

                        for k2, v in d["standard"].items():
                            try:
                                if "yrTerm" in v:
                                    if "reserved" not in i.pricing[region][_os]:
                                        i.pricing[region][_os]["reserved"] = {}
                                    i.pricing[region][_os]["reserved"][v] = info[k2]
                                else:
                                    i.pricing[region][_os][v] = info[k2]
                            except KeyError:
                                # print("{} {} standard not found in {} pricing file".format(k, k2, region))
                                pass


def combine_specs_pricing():
    specs_file = "www/azure/instances-specs.json"
    pricing_file = "www/azure/instances.json"
    with open(pricing_file, "r") as f:
        instances = json.load(f)

    with open(specs_file, "r") as f:
        specs = json.load(f)

    missing = []
    for i in instances:
        found_flag = False
        for s in specs:
            if i["instance_type"] == s["instance_type"]:
                # print('Found matching pricing and specs for {}'.format(i["instance_type"]))
                found_flag = True
                break

        if found_flag:
            i.update(s)
        else:
            i["pretty_name_azure"] = i["pretty_name"]
            missing.append(i["instance_type"])

    for m in missing:
        print("Could not find specs to match these instance pricing for {}".format(m))

    with open(pricing_file, "w+") as f:
        json.dump(
            [i for i in instances],
            f,
            indent=1,
            sort_keys=True,
            separators=(",", ": "),
        )


def scrape(output_file, input_file=None):
    azure_prices2()
    instances = azure_specs()
    add_pricing2(instances)

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w+") as f:
        json.dump(
            [i.to_dict() for i in instances.values()],
            f,
            indent=1,
            sort_keys=True,
            separators=(",", ": "),
        )

    # This adds specs for a hardcoded file to instances.json
    combine_specs_pricing()


if __name__ == "__main__":
    output_file = "www/azure/instances.json"
    scrape(output_file)

    # Run this to build the instances-specs.json file
    # azure_vm_specs()
    # combine_specs_pricing()
