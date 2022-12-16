#!/usr/bin/env python
import requests
import json
import scrape
import os
import yaml
from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient


class AzureInstance(object):
    def __init__(self):
        self.ACU = 0
        self.accelerated_networking = None
        self.arch = []
        self.api_description = None
        self.availability_zones = {}
        self.cached_disk = 0
        self.capacity_support = None
        self.clock_speed_ghz = None
        self.compute_capability = 0
        self.confidential = None
        self.devices = 0
        self.drive_size = None
        self.ephemeral_disk = None
        self.encryption = None
        self.family = ""
        self.FPGA = 0
        self.generation = None
        self.GPU = 0
        self.GPU_memory = 0
        self.GPU_model = None
        self.hibernation = None
        self.hyperv_generations = None
        self.instance_type = ""
        self.iops = None
        self.low_priority = None
        self.max_write_disks = None
        self.memory = 0
        self.memory_maintenance = None
        self.network_interfaces = None
        self.network_performance = None
        self.num_drives = None
        self.nvme_ssd = False
        self.parent_size = None
        self.premium_io = None
        self.physical_processor = None
        self.pretty_name = ""
        self.pricing = {}
        self.rdma = None
        self.read_io = 0
        self.size = 0
        self.ssd = False
        self.trusted_launch = None
        self.ultra_ssd = None
        self.uncached_disk = 0
        self.uncached_disk_io = 0
        self.vcpu = 0
        self.vcpus_available = 0
        self.vcpus_percore = 0
        self.vm_deployment = None
        self.write_io = 0

    def get_type_prefix(self):
        """h1, i3, d2, etc"""
        return self.instance_type.split(".")[0]

    def to_dict(self):
        d = dict(
            family=self.family,
            instance_type=self.instance_type,
            pretty_name=self.pretty_name,
            accelerated_networking=self.accelerated_networking,
            ACU=self.ACU,
            arch=self.arch,
            vcpu=self.vcpu,
            GPU=self.GPU,
            GPU_model=self.GPU_model,
            GPU_memory=self.GPU_memory,
            compute_capability=self.compute_capability,
            FPGA=self.FPGA,
            memory=self.memory,
            network_performance=self.network_performance,
            pricing=self.pricing,
            generation=self.generation,
            physical_processor=self.physical_processor,
            clock_speed_ghz=self.clock_speed_ghz,
            availability_zones=self.availability_zones,
            cached_disk=self.cached_disk,
            capacity_support=self.capacity_support,
            confidential=self.confidential,
            encryption = self.encryption,
            hibernation=self.hibernation,
            hyperv_generations = self.hyperv_generations,
            iops=self.iops,
            low_priority=self.low_priority,
            memory_maintenance=self.memory_maintenance,
            parent_size=self.parent_size,
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
            write_io=self.write_io
        )
        d["storage"] = dict(
            ssd=self.ssd,
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
            i.pricing[region][os] = {'spot': price}
        else:
            i.pricing[region][os] = {'ondemand': price}
    elif info["type"] == "Reservation":
        if 'reserved' not in i.pricing[region][os]:
            i.pricing[region][os]["reserved"] = {}
        if info["reservationTerm"] == "1 Year":
            i.pricing[region][os]["reserved"] = {'yrTerm1Standard.allUpfront': price}
        elif info["reservationTerm"] == "3 Years":
            i.pricing[region][os]["reserved"] = {'yrTerm3Standard.allUpfront': price}
    elif info["type"] == "DevTestConsumption":
        i.pricing[region][os] = {'devtest': price}


def parse_instance(i, info):
    i.instance_type = info["armSkuName"]
    i.pretty_name = info["productName"]
    region = info["armRegionName"]
    price = info["retailPrice"]

    if region not in i.pricing:
        i.pricing[region] = {}
    
    if 'Windows' in info["productName"]:
        split_pricing(i, info, region, "windows", price)
    else:
        split_pricing(i, info, region, "linux", price)


def parse_specs(i, cap):
    for c in cap:
        if c.name == 'MaxResourceVolumeMB':
            i.size = c.value
        elif c.name == 'OSVhdSizeMB':
            i.drive_size = c.value
        elif c.name == 'vCPUs':
            i.vcpus = c.value
        elif c.name == 'ACUs':
            i.ACU = c.value
        elif c.name == 'MemoryPreservingMaintenanceSupported':
            i.memory_maintenance = c.value
        elif c.name == 'HyperVGenerations':
            i.hyperv_generations = c.value
        elif c.name == 'MemoryGB':
            i.memory = float(c.value)
        elif c.name == 'MaxDataDiskCount':
            i.devices = int(c.value)
        elif c.name == 'CpuArchitectureType':
            i.arch = [c.value]
        elif c.name == 'LowPriorityCapable':
            i.low_priority = c.value
        elif c.name == 'PremiumIO':
            i.premium_io = c.value
        elif c.name == 'VMDeploymentTypes':
            i.vm_deployment = c.value
        elif c.name == 'vCPUsAvailable':
            i.vcpus_available = c.value
        elif c.name == 'vCPUsPerCore':
            i.vcpus_percore = c.value
        elif c.name == 'CombinedTempDiskAndCachedIOPS':
            i.iops = c.value
        elif c.name == 'CombinedTempDiskAndCachedReadBytesPerSecond':
            i.read_io = int(c.value)
        elif c.name == 'CombinedTempDiskAndCachedWriteBytesPerSecond':
            i.write_io = int(c.value)
        elif c.name == 'CachedDiskBytes':
            i.cached_disk = int(c.value)
        elif c.name == 'UncachedDiskIOPS':
            i.uncached_disk = int(c.value)
        elif c.name == 'UncachedDiskBytesPerSecond':
            i.uncached_disk_io = int(c.value)
        elif c.name == 'EphemeralOSDiskSupported':
            i.ephemeral_disk = c.value
        elif c.name == 'EncryptionAtHostSupported':
            i.encryption = c.value
        elif c.name == 'CapacityReservationSupported':
            i.capacity_support = c.value
        elif c.name == 'AcceleratedNetworkingEnabled':
            i.accelerated_networking = c.value
        elif c.name == 'RdmaEnabled':
            i.rdma = c.value
        elif c.name == 'MaxNetworkInterfaces':
            i.network_interfaces = c.value
        elif c.name == 'UltraSSDAvailable':
            i.ultra_ssd = c.value
        elif c.name == 'HibernationSupported':
            i.hibernation = c.value
        elif c.name == 'TrustedLaunchDisabled':
            i.trusted_launch = c.value
        elif c.name == 'ConfidentialComputingType':
            i.confidential = c.value
        elif c.name == 'ParentSize':
            i.parent_size = c.value
        elif c.name == 'NvmeDiskSizeInMiB':
            i.nvme_ssd = c.value
        elif c.name == 'GPUs':
            i.GPU = c.value
        elif c.name == 'MaxWriteAcceleratorDisksAllowed':
            i.max_write_disks = c.value
        else:
            print("Found unexpected attribute {} for instance type {}".format(c.name, i.instance_type))

    
def azure_vm_specs():
    credential = DefaultAzureCredential()

    # Retrieve subscription ID from environment variable.
    subscription_id = os.environ["AZURE_SUBSCRIPTION_ID"]

    # Obtain the management object for resources.
    compute_client = ComputeManagementClient(credential, subscription_id)

    instances = {}
    skus_list = compute_client.resource_skus.list()
    i = 0
    for s in skus_list:
        if s.resource_type == 'virtualMachines':
            if s.name not in instances:
                instances[s.name] = AzureInstance()
                instances[s.name].instance_type = s.name
                parse_specs(instances[s.name], s.capabilities)
            i += 1
    print("Went through {} SKUs".format(i))

    return instances


def azure_prices(instances):
    missing_instances = []
    s = requests.Session()

    response = s.get("https://prices.azure.com/api/retail/prices?$filter=serviceName eq 'Virtual Machines'").json()
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

    data_file = 'www/azure/instances.json'
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
    "red-hat",
    "sles-basic",
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
        print('Fetching {}'.format(url))
        response = s.get(url).json()

        file = 'www/azure/{}.json'.format(_os)
        print('Saving {}'.format(file))
        with open(file, 'w') as f:
            json.dump(response, f, indent=4)

        sleep(randint(1,5))


    for _os in oss:
        for region in load_regions():
            url = prices_url.format(_os, region)
            print('Fetching {}'.format(url))
            response = s.get(url).json()

            file = 'www/azure/{}_{}.json'.format(region, _os)
            print('Saving {}'.format(file))
            with open(file, 'w') as f:
                json.dump(response, f, indent=4)

            # Be respectful
            sleep(randint(1,5))


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
        self.GPU = ""
    
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
        specs_file = 'www/azure/{}.json'.format(_os)

        with open(specs_file, 'r') as f:
            instance_specs = json.load(f)
            for k, info in instance_specs["attributesByOffer"].items():
                instance_type = k.split('-')[1]
                if instance_type not in instances:
                    i = AzureInstance2(instance_type)
                    parse_instance2(i, info)
                    instances[instance_type] = i

            print('Found {} {} instances'.format(len(instance_specs["attributesByOffer"].keys()), _os))

    return instances


def add_pricing2(instances):
    d= {}
    d["basic"] = {
        "perhour": "basic", # 0.032,
        "perhourspot": "basic-spot" # 0.007731,
        # "perhourhybridbenefit": 0.023,
        # "perhourpaygoneyearsubscription": 0.05405,
        # "perhourpaygthreeyearsubscription": 0.0437,
        # "perhourspothybridbenefit": 0.003705
    }

    d["lowpriority"] = {
        "perhour": "lowpriority", # 1.044,
        # "perhourhybridbenefit": 0.375,
        # "perhourpaygoneyearsubscription": 0.4371,
        # "perhourpaygthreeyearsubscription": 0.4164
    }

    d["standard"] = {
        "perhour": "ondemand", # 2.61,
        "perhouroneyearreserved": "yrTerm1Standard.allUpfront", # 1.84159
        "perhourthreeyearreserved": "yrTerm3Standard.allUpfront", # 1.44806,
        "perunitoneyearsavings": "yrTerm1Savings.allUpfront", # 2.00432,
        "perunitthreeyearsavings": "yrTerm3Savings.allUpfront", # 1.62371,
        "perhourspot": "spot", # 0.427518,
        "perhourhybridbenefit": "hybridbenefit", # 1.874,
        "perhouroneyearreservedhybridbenefit": "yrTerm1Standard.hybridbenefit",# 1.10559,
        "perhourthreeyearreservedhybridbenefit": "yrTerm3Standard.hybridbenefit", # 0.71206,
        "perunitoneyearsavingshybridbenefit": "yrTerm3Savings.hybridbenefit", #1.26832,
        "perunitthreeyearsavingshybridbenefit": "yrTerm3Savings.hybridbenefit", # 0.88771,
        "perhourpaygoneyearsubscription": "yrTerm1Standard.subscription", #1.9361, 
        "perhourpaygthreeyearsubscription": "yrTerm3Standard.subscription", # 1.9154,
        # "perhouroneyearreservedoneyearsubscription": 1.11241,
        # "perhouroneyearreservedthreeyearsubscription": 1.09171,
        # "perhourthreeyearreservedoneyearsubscription": 0.73856,
        # "perhourthreeyearreservedthreeyearsubscription": 0.71786,
        # "perhourspothybridbenefit": 0.306961
    }

    for _os in oss[0:2]:
        for region in load_regions():
            file = 'www/azure/{}_{}.json'.format(region, _os)

            with open(file, 'r') as f:
                instance_pricing = json.load(f)

                for k, info in instance_pricing.items():
                    instance_type = k.split('-')[1]
                    try:
                        i = instances[instance_type]
                    except KeyError:
                        print("Instance {} from pricing file not found".format(instance_type))

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

    data_file = 'www/azure/instances.json'
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    with open(data_file, "w+") as f:
        json.dump(
            [i.to_dict() for i in instances.values()],
            f,
            indent=1,
            sort_keys=True,
            separators=(",", ": "),
        )


if __name__ == '__main__':
    # azure_prices2()
    instances = azure_specs()
    add_pricing2(instances)