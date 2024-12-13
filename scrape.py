#!/usr/bin/env python
from lxml import etree
import re
import json
import locale
import gzip
import ec2
import os
import requests
import pickle
import boto3
import logging
from six.moves.urllib import request as urllib2

from parallel_scraper import ParallelScraper
from parallel_pricing import ParallelPricingCollector
from dedicated_price_collector import DedicatedPriceCollector
from logging_setup import setup_logging, log_api_call, log_scraping_progress

logger = setup_logging()

# Following advice from https://stackoverflow.com/a/1779324/216138
# The locale must be installed in the system, and it must be one where ',' is
# the thousans separator and '.' is the decimal fraction separator.
locale.setlocale(locale.LC_ALL, "en_US.UTF-8")


class Instance(object):
    def __init__(self):
        self.arch = []
        self.api_description = None
        self.availability_zones = {}
        self.base_performance = None
        self.burst_minutes = None
        self.clock_speed_ghz = None
        self.compute_capability = 0
        self.devices = 0
        self.drive_size = None
        self.ebs_iops = 0
        self.ebs_max_bandwidth = 0
        self.ebs_only = True
        self.ebs_optimized = False
        self.ebs_throughput = 0
        self.ebs_as_nvme = False
        self.ebs_baseline_throughput = 0
        self.ebs_baseline_iops = 0
        self.ebs_baseline_bandwidth = 0
        self.ECU = 0
        self.enhanced_networking = None
        self.family = ""
        self.FPGA = 0
        self.generation = None
        self.GPU = 0
        self.GPU_memory = 0
        self.GPU_model = None
        self.includes_swap_partition = False
        self.instance_type = ""
        self.intel_avx = None
        self.intel_avx2 = None
        self.intel_avx512 = None
        self.intel_turbo = None
        self.linux_virtualization_types = []
        self.memory = 0
        self.network_performance = None
        self.num_drives = None
        self.nvme_ssd = False
        self.physical_processor = None
        self.placement_group_support = True
        self.pretty_name = ""
        self.pricing = {}
        self.regions = {}
        self.size = 0
        self.ssd = False
        self.storage_needs_initialization = False
        self.trim_support = False
        self.vCPU = 0
        self.vpc = None
        self.vpc_only = True
        self.emr = False

    def get_type_prefix(self):
        """h1, i3, d2, etc"""
        return self.instance_type.split(".")[0]

    def get_ipv6_support(self):
        """Fancy parsing not needed for ipv6 support.

        "IPv6 is supported on all current generation instance types and the
         C3, R3, and I2 previous generation instance types."
         - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html

        FIXME: This should be a @property, but this project is still Python 2. Yikes!

        """
        ipv4_only_families = (
            "cg1",
            "m1",
            "m3",
            "c1",
            "cc2",
            "g2",
            "m2",
            "cr1",
            "hs1",
            "t1",
        )
        return self.get_type_prefix() not in ipv4_only_families

    def to_dict(self):
        d = dict(
            family=self.family,
            instance_type=self.instance_type,
            pretty_name=self.pretty_name,
            arch=self.arch,
            vCPU=self.vCPU,
            GPU=self.GPU,
            GPU_model=self.GPU_model,
            GPU_memory=self.GPU_memory,
            compute_capability=self.compute_capability,
            FPGA=self.FPGA,
            ECU=self.ECU,
            base_performance=self.base_performance,
            burst_minutes=self.burst_minutes,
            memory=self.memory,
            ebs_optimized=self.ebs_optimized,
            ebs_throughput=self.ebs_throughput,
            ebs_iops=self.ebs_iops,
            ebs_as_nvme=self.ebs_as_nvme,
            ebs_max_bandwidth=self.ebs_max_bandwidth,
            ebs_baseline_throughput=self.ebs_baseline_throughput,
            ebs_baseline_iops=self.ebs_baseline_iops,
            ebs_baseline_bandwidth=self.ebs_baseline_bandwidth,
            network_performance=self.network_performance,
            enhanced_networking=self.enhanced_networking,
            placement_group_support=self.placement_group_support,
            pricing=self.pricing,
            vpc=self.vpc,
            linux_virtualization_types=self.linux_virtualization_types,
            generation=self.generation,
            vpc_only=self.vpc_only,
            ipv6_support=self.get_ipv6_support(),
            physical_processor=self.physical_processor,
            clock_speed_ghz=self.clock_speed_ghz,
            intel_avx=self.intel_avx,
            intel_avx2=self.intel_avx2,
            intel_avx512=self.intel_avx512,
            intel_turbo=self.intel_turbo,
            emr=self.emr,
            availability_zones=self.availability_zones,
            regions=self.regions,
        )
        if self.ebs_only:
            d["storage"] = None
        else:
            d["storage"] = dict(
                ssd=self.ssd,
                trim_support=self.trim_support,
                nvme_ssd=self.nvme_ssd,
                storage_needs_initialization=self.storage_needs_initialization,
                includes_swap_partition=self.includes_swap_partition,
                devices=self.num_drives,
                size=self.drive_size,
                size_unit=self.size_unit,
            )
        return d

    def __repr__(self):
        return "<Instance {}>".format(self.instance_type)


def sanitize_instance_type(instance_type):
    """Typos and other bad data are common in the instance type columns for some reason"""
    # Remove random whitespace
    instance_type = re.sub(r"\s+", "", instance_type, flags=re.UNICODE)

    # Correct typos
    typo_corrections = {
        "x1.16large": "x1.16xlarge",  # https://github.com/powdahound/ec2instances.info/issues/199
        "i3.4xlxarge": "i3.4xlarge",  # https://github.com/powdahound/ec2instances.info/issues/227
        "i3.16large": "i3.16xlarge",  # https://github.com/powdahound/ec2instances.info/issues/227
        "p4d.2xlarge": "p4d.24xlarge",  # as of 2020-11-15
    }
    return typo_corrections.get(instance_type, instance_type)


def totext(elt):
    s = etree.tostring(elt, method="text", encoding="unicode").strip()
    return re.sub(r"\*\d$", "", s)


def transform_size(size):
    if size == "u":
        return "micro"
    if size == "sm":
        return "small"
    if size == "med":
        return "medium"
    m = re.search("^(x+)l$", size)
    if m:
        xs = len(m.group(1))
        if xs == 1:
            return "xlarge"
        else:
            return str(xs) + "xlarge"
    assert size == "lg", "Unable to parse size: %s" % (size,)
    return "large"


def transform_region(reg):
    region_map = {
        "eu-ireland": "eu-west-1",
        "eu-frankfurt": "eu-central-1",
        "apac-sin": "ap-southeast-1",
        "apac-syd": "ap-southeast-2",
        "apac-tokyo": "ap-northeast-1",
    }
    if reg in region_map:
        return region_map[reg]
    m = re.search(r"^([^0-9]*)(-(\d))?$", reg)
    assert m, "Can't parse region: %s" % (reg,)
    base = m.group(1)
    num = m.group(3) or "1"
    return base + "-" + num


def add_ebs_pricing(imap, data):
    for region_spec in data["config"]["regions"]:
        region = transform_region(region_spec["region"])
        for t_spec in region_spec["instanceTypes"]:
            typename = t_spec["type"]
            for i_spec in t_spec["sizes"]:
                i_type = i_spec["size"]
                if i_type not in imap:
                    print(
                        "ERROR: Got EBS pricing data for unknown instance type: {}".format(
                            i_type
                        )
                    )
                    continue
                inst = imap[i_type]
                inst.pricing.setdefault(region, {})
                # print "%s/%s" % (region, i_type)

                for col in i_spec["valueColumns"]:
                    inst.pricing[region]["ebs"] = col["prices"]["USD"]


def add_pricing_info(instances):
    for i in instances:
        i.pricing = {}

    by_type = {i.instance_type: i for i in instances}
    ec2.add_pricing(by_type)

    # EBS cost surcharge as per https://aws.amazon.com/ec2/pricing/on-demand/#EBS-Optimized_Instances
    ebs_pricing_url = (
        "https://a0.awsstatic.com/pricing/1/ec2/pricing-ebs-optimized-instances.min.js"
    )
    pricing = fetch_data(ebs_pricing_url)
    add_ebs_pricing(by_type, pricing)


def fetch_data(url):
    response = urllib2.urlopen(url).read()

    try:
        content = response.decode()
    except UnicodeDecodeError:
        content = gzip.decompress(response).decode()

    try:
        pricing = json.loads(content)
    except ValueError:
        # if the data isn't compatible JSON, try to parse as jsonP
        json_string = re.search(r"callback\((.*)\);", content).groups()[
            0
        ]  # extract javascript object
        json_string = re.sub(r"(\w+):", r'"\1":', json_string)  # convert to json
        pricing = json.loads(json_string)

    return pricing


def add_eni_info(instances):
    client = boto3.client('ec2', region_name='us-east-1')
    pager = client.get_paginator("describe_instance_types")
    responses = pager.paginate(Filters=[{'Name': 'instance-type', 'Values': ['*']}])
    for response in responses:
        instance_types = response['InstanceTypes']

        by_type = {i.instance_type: i for i in instances}

        for instance_type_info in instance_types:
            instance_type = instance_type_info['InstanceType']
            max_enis = instance_type_info['NetworkInfo']['MaximumNetworkInterfaces']
            ip_per_eni = instance_type_info['NetworkInfo']['Ipv4AddressesPerInterface']

            if instance_type not in by_type:
                print(
                    "WARNING: Ignoring data for unknown instance type: {}".format(
                        instance_type
                    )
                )
                continue

            if not by_type[instance_type].vpc:
                print(
                    f"WARNING: DescribeInstanceTypes API does not have network info for {instance_type}, scraping instead"
                )
                by_type[instance_type].vpc = {
                    "max_enis": max_enis,
                    "ips_per_eni": ip_per_eni,
                }

def add_linux_ami_info(instances):
    """Add information about which virtualization options are supported.

    Note that only HVM is supported for Windows instances so that info is not
    given its own column.

    """
    checkmark_char = "\u2713"
    url = "http://aws.amazon.com/amazon-linux-ami/instance-type-matrix/"
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())
    table = tree.xpath('//div[@class="aws-table"]/table')[0]
    rows = table.xpath(".//tr[./td]")[1:]  # ignore header

    for r in rows:
        supported_types = []
        family_id = totext(r[0]).lower()
        if not family_id:
            continue
        # We only check the primary EBS-backed values here since the 'storage'
        # column will already be able to tell users whether or not the instance
        # they're looking at can use EBS and/or instance-store AMIs.
        try:
            if totext(r[1]) == checkmark_char:
                supported_types.append("HVM")
            if len(r) >= 4 and totext(r[3]) == checkmark_char:
                supported_types.append("PV")
        except Exception as e:
            # 2018-08-01: handle missing cells on last row in this table...
            print("Exception while parsing AMI info for {}: {}".format(family_id, e))

        # Apply types for this instance family to all matching instances
        for i in instances:
            i_family_id = i.instance_type.split(".")[0]
            if i_family_id == family_id:
                i.linux_virtualization_types = supported_types

    # http://aws.amazon.com/amazon-linux-ami/instance-type-matrix/ page is
    # missing info about both older (t1, m1, c1, m2) and newer exotic (cg1,
    # cr1, hi1, hs1, cc2) instance type generations.

    # Adding "manual" info about older generations
    # Some background info at https://github.com/powdahound/ec2instances.info/pull/161
    for i in instances:
        i_family_id = i.instance_type.split(".")[0]
        if i_family_id in ("cc2", "cg1", "hi1", "hs1"):
            if not "HVM" in i.linux_virtualization_types:
                i.linux_virtualization_types.append("HVM")
        if i_family_id in ("t1", "m1", "m2", "c1", "hi1", "hs1"):
            if not "PV" in i.linux_virtualization_types:
                i.linux_virtualization_types.append("PV")


def add_vpconly_detail(instances):
    # A few legacy instances can be launched in EC2 Classic, the rest is VPC only
    # https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-classic-platform.html#ec2-classic-instance-types
    classic_families = (
        "m1",
        "m3",
        "t1",
        "c1",
        "c3",
        "cc2",
        "cr1",
        "m2",
        "r3",
        "d2",
        "hs1",
        "i2",
        "g2",
    )
    for i in instances:
        for family in classic_families:
            if i.instance_type.startswith(family):
                i.vpc_only = False


def add_instance_storage_details(instances):
    """Add information about instance storage features."""
    client = boto3.client('ec2', region_name='us-east-1')
    pager = client.get_paginator("describe_instance_types")
    responses = pager.paginate(Filters=[{'Name': 'instance-storage-supported', 'Values': ['true']},{'Name': 'instance-type', 'Values': ['*']}])

    for response in responses:
        instance_types = response['InstanceTypes']

        for i in instances:
            for instance_type in instance_types:
                if i.instance_type == instance_type["InstanceType"]:
                    storage_info = instance_type["InstanceStorageInfo"]

                    if storage_info:
                        nvme_support = storage_info["NvmeSupport"]
                        disk = storage_info["Disks"][0]

                        i.ebs_only = False
                        i.num_drives = disk["Count"]
                        i.drive_size = disk["SizeInGB"]
                        i.size_unit = "GB"
                        i.ssd = "ssd" == disk["Type"]
                        i.nvme_ssd = nvme_support in ['supported', 'required']

def add_t2_credits(instances):
    # Canonical URL for this info is
    #   http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/t2-credits-baseline-concepts.html
    # url = "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.partial.html"
    # It seems it's no longer dynamically loaded
    url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/t2-credits-baseline-concepts.html"
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())
    table = tree.xpath('//div[@class="table-contents"]//table')[1]
    rows = table.xpath(".//tr[./td]")
    assert len(rows) > 0, "Failed to find T2 CPU credit info"

    by_type = {i.instance_type: i for i in instances}

    for r in rows:
        if len(r) > 1:
            inst_type = totext(r[0])
            if not inst_type in by_type:
                print(
                    f"WARNING: Skipping unknown instance type '{inst_type}' in CPU credit info table"
                )
                continue
            inst = by_type[inst_type]
            creds_per_hour = locale.atof(totext(r[1]))
            inst.base_performance = creds_per_hour / 60
            inst.burst_minutes = creds_per_hour * 24 / inst.vCPU


def add_pretty_names(instances):
    family_names = {
        "c1": "C1 High-CPU",
        "c3": "C3 High-CPU",
        "c4": "C4 High-CPU",
        "c5": "C5 High-CPU",
        "c5d": "C5 High-CPU",
        "cc2": "Cluster Compute",
        "cg1": "Cluster GPU",
        "cr1": "High Memory Cluster",
        "g4": "G4 Accelerated Computing",
        "hi1": "HI1. High I/O",
        "hs1": "High Storage",
        "i3": "I3 High I/O",
        "m1": "M1 General Purpose",
        "m2": "M2 High Memory",
        "m3": "M3 General Purpose",
        "m4": "M4 General Purpose",
        "m5": "M5 General Purpose",
        "m5d": "M5 General Purpose",
        "g3": "G3 Graphics GPU",
        "g4": "G4 Graphics and Machine Learning GPU",
        "g5": "G5 Graphics and Machine Learning GPU",
        "g6": "G6 Graphics and Machine Learning GPU",
        "gr6": "Gr6 Graphics and Machine Learning GPU High RAM ratio",
        "p2": "P2 General Purpose GPU",
        "p3": "P3 High Performance GPU",
        "p4d": "P4D Highest Performance GPU",
        "r3": "R3 High-Memory",
        "r4": "R4 High-Memory",
        "x1": "X1 Extra High-Memory",
    }
    for i in instances:
        pieces = i.instance_type.split(".")
        family = pieces[0]
        short = pieces[1]
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

        i.pretty_name = " ".join([b for b in bits if b])


def add_emr_info(instances):
    url = "https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/elasticmapreduce/USD/current/elasticmapreduce.json"
    pricing = fetch_data(url)

    region_map = {value: key for key, value in ec2.get_region_descriptions().items()}

    emr_prices = {}
    for region in pricing["regions"]:
        emr_prices[region] = {}
        for inst_type in pricing["regions"][region]:
            _inst_name = inst_type.replace("Instance-instancetype-", "")
            _price = pricing["regions"][region][inst_type]["price"]
            emr_prices[region][_inst_name] = _price

    for inst in instances:
        for region in inst.pricing:
            try:
                emr_price = {}
                region = ec2.canonicalize_location(region, False)

                # The frontend expects ["emr"]["emr"] for some reason
                emr_price["emr"] = emr_prices[region_map[region]][inst.instance_type]
                inst.pricing[region]["emr"] = emr_price
                # TODO: this is set for the whole instance when it should be per-region
                inst.emr = True
            except KeyError:
                pass


def add_gpu_info(instances):
    """
    Add info about GPUs from the manually-curated dictionaries below. They are
    manually curated because GPU models and their corresponding CUDA Compute
    Capability are not listed in a structured form anywhere in the AWS docs.

    This function will print a warning if it encounters an instance with
    .GPU > 0 for which GPU information is not included in the dictionaries
    below. This may indicate that AWS has added a new GPU instance type. If you
    see such a warning and want to fill in the missing information, check
    https://aws.amazon.com/ec2/instance-types/#Accelerated_Computing for
    descriptions of the instance types and https://en.wikipedia.org/wiki/CUDA
    for information on the CUDA compute capability of different Nvidia GPU
    models.

    For G5 instances, please reference the following:
      https://aws.amazon.com/ec2/instance-types/g5/
      https://github.com/vantage-sh/ec2instances.info/issues/593
    """
    gpu_data = {
        "g2.2xlarge": {
            # No longer listed in AWS docs linked above. Alternative source is
            # https://medium.com/@manku_timma1/part-1-g2-2xlarge-gpu-basics-805ad40a37a4
            # The model has 2 units, 4G of memory each, but AWS exposes only 1 unit per instance
            "gpu_model": "NVIDIA GRID K520",
            "compute_capability": 3.0,
            "gpu_count": 1,
            "cuda_cores": 3072,
            "gpu_memory": 4,
        },
        "g2.8xlarge": {
            # No longer listed in AWS docs linked above. Alternative source is
            # https://aws.amazon.com/blogs/aws/new-g2-instance-type-with-4x-more-gpu-power/
            "gpu_model": "NVIDIA GRID K520",
            "compute_capability": 3.0,
            "gpu_count": 4,
            "cuda_cores": 6144,
            "gpu_memory": 16,
        },
        "g3s.xlarge": {
            "gpu_model": "NVIDIA Tesla M60",
            "compute_capability": 5.2,
            "gpu_count": 1,
            "cuda_cores": 2048,
            "gpu_memory": 8,
        },
        "g3.4xlarge": {
            "gpu_model": "NVIDIA Tesla M60",
            "compute_capability": 5.2,
            "gpu_count": 1,
            "cuda_cores": 2048,
            "gpu_memory": 8,
        },
        "g3.8xlarge": {
            "gpu_model": "NVIDIA Tesla M60",
            "compute_capability": 5.2,
            "gpu_count": 2,
            "cuda_cores": 4096,
            "gpu_memory": 16,
        },
        "g3.16xlarge": {
            "gpu_model": "NVIDIA Tesla M60",
            "compute_capability": 5.2,
            "gpu_count": 4,
            "cuda_cores": 8192,
            "gpu_memory": 32,
        },
        "g4dn.xlarge": {
            "gpu_model": "NVIDIA T4 Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g4dn.2xlarge": {
            "gpu_model": "NVIDIA T4 Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g4dn.4xlarge": {
            "gpu_model": "NVIDIA T4 Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g4dn.8xlarge": {
            "gpu_model": "NVIDIA T4 Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g4dn.16xlarge": {
            "gpu_model": "NVIDIA T4 Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g4dn.12xlarge": {
            "gpu_model": "NVIDIA T4 Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 4,
            "cuda_cores": 10240,
            "gpu_memory": 64,
        },
        "g4dn.metal": {
            "gpu_model": "NVIDIA T4 Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 8,
            "cuda_cores": 20480,
            "gpu_memory": 128,
        },
        "p2.xlarge": {
            "gpu_model": "NVIDIA Tesla K80",
            "compute_capability": 3.7,
            "gpu_count": 1,
            "cuda_cores": 2496,
            "gpu_memory": 12,
        },
        "p2.8xlarge": {
            "gpu_model": "NVIDIA Tesla K80",
            "compute_capability": 3.7,
            "gpu_count": 4,
            "cuda_cores": 19968,
            "gpu_memory": 96,
        },
        "p2.16xlarge": {
            "gpu_model": "NVIDIA Tesla K80",
            "compute_capability": 3.7,
            "gpu_count": 8,
            "cuda_cores": 39936,
            "gpu_memory": 192,
        },
        "p3.2xlarge": {
            "gpu_model": "NVIDIA Tesla V100",
            "compute_capability": 7.0,
            "gpu_count": 1,
            "cuda_cores": 5120,
            "gpu_memory": 16,
        },
        "p3.8xlarge": {
            "gpu_model": "NVIDIA Tesla V100",
            "compute_capability": 7.0,
            "gpu_count": 4,
            "cuda_cores": 20480,
            "gpu_memory": 64,
        },
        "p3.16xlarge": {
            "gpu_model": "NVIDIA Tesla V100",
            "compute_capability": 7.0,
            "gpu_count": 8,
            "cuda_cores": 40960,
            "gpu_memory": 128,
        },
        "p3dn.24xlarge": {
            "gpu_model": "NVIDIA Tesla V100",
            "compute_capability": 7.0,
            "gpu_count": 8,
            "cuda_cores": 40960,
            "gpu_memory": 256,
        },
        "g5.xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 1,
            "cuda_cores": 9616,
            "gpu_memory": 24,
        },
        "g5.2xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 1,
            "cuda_cores": 9616,
            "gpu_memory": 24,
        },
        "g5.4xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 1,
            "cuda_cores": 9616,
            "gpu_memory": 24,
        },
        "g5.8xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 1,
            "cuda_cores": 9616,
            "gpu_memory": 24,
        },
        "g5.16xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 1,
            "cuda_cores": 9616,
            "gpu_memory": 24,
        },
        "g5.12xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 4,
            "cuda_cores": 38464,
            "gpu_memory": 96,
        },
        "g5.24xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 4,
            "cuda_cores": 38464,
            "gpu_memory": 96,
        },
        "g5.48xlarge": {
            "gpu_model": "NVIDIA A10G",
            "compute_capability": 8.6,
            "gpu_count": 8,
            "cuda_cores": 76928,
            "gpu_memory": 192,
        },
        "g6.xlarge": {
            # GPU core count found from the whitepaper
            # https://images.nvidia.com/aem-dam/Solutions/Data-Center/l4/nvidia-ada-gpu-architecture-whitepaper-v2.1.pdf
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 1,
            "cuda_cores": 7424,
            "gpu_memory": 24,
        },
        "g6.2xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 1,
            "cuda_cores": 7424,
            "gpu_memory": 24,
        },
        "g6.4xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 1,
            "cuda_cores": 7424,
            "gpu_memory": 24,
        },
        "g6.8xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 1,
            "cuda_cores": 7424,
            "gpu_memory": 24,
        },
        "gr6.4xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 1,
            "cuda_cores": 7424,
            "gpu_memory": 24,
        },
        "gr6.8xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 1,
            "cuda_cores": 7424,
            "gpu_memory": 24,
        },
        "g6.16xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 1,
            "cuda_cores": 7424,
            "gpu_memory": 24,
        },
        "g6.12xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 4,
            "cuda_cores": 29696,
            "gpu_memory": 96,
        },
        "g6.24xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 4,
            "cuda_cores": 29696,
            "gpu_memory": 96,
        },
        "g6.48xlarge": {
            "gpu_model": "NVIDIA L4",
            "compute_capability": 8.9,
            "gpu_count": 8,
            "cuda_cores": 59392,
            "gpu_memory": 192,
        },
        "p4d.24xlarge": {
            "gpu_model": "NVIDIA A100",
            "compute_capability": 8.0,
            "gpu_count": 8,
            "cuda_cores": 55296,  # Source: Asked Matthew Wilson at AWS as this isn't public anywhere.
            "gpu_memory": 320,
        },
        "p4de.24xlarge": {
            "gpu_model": "NVIDIA A100",
            "compute_capability": 8.0,
            "gpu_count": 8,
            "cuda_cores": 55296,
            "gpu_memory": 640,
        },
        "g5g.xlarge": {
            "gpu_model": "NVIDIA T4G Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g5g.2xlarge": {
            "gpu_model": "NVIDIA T4G Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g5g.4xlarge": {
            "gpu_model": "NVIDIA T4G Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g5g.8xlarge": {
            "gpu_model": "NVIDIA T4G Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 1,
            "cuda_cores": 2560,
            "gpu_memory": 16,
        },
        "g5g.16xlarge": {
            "gpu_model": "NVIDIA T4G Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 2,
            "cuda_cores": 5120,
            "gpu_memory": 32,
        },
        "g5g.metal": {
            "gpu_model": "NVIDIA T4G Tensor Core",
            "compute_capability": 7.5,
            "gpu_count": 2,
            "cuda_cores": 5120,
            "gpu_memory": 32,
        },
        "g4ad.xlarge": {
            "gpu_model": "AMD Radeon Pro V520",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 8,
        },
        "g4ad.2xlarge": {
            "gpu_model": "AMD Radeon Pro V520",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 8,
        },
        "g4ad.4xlarge": {
            "gpu_model": "AMD Radeon Pro V520",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 8,
        },
        "g4ad.8xlarge": {
            "gpu_model": "AMD Radeon Pro V520",
            "compute_capability": 0,
            "gpu_count": 2,
            "gpu_memory": 16,
        },
        "g4ad.16xlarge": {
            "gpu_model": "AMD Radeon Pro V520",
            "compute_capability": 0,
            "gpu_count": 4,
            "gpu_memory": 32,
        },
        "trn1.2xlarge": {
            "gpu_model": "AWS Inferentia",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 32,
        },
        "trn1.32xlarge": {
            "gpu_model": "AWS Inferentia",
            "compute_capability": 0,
            "gpu_count": 16,
            "gpu_memory": 512,
        },
        "trn1n.32xlarge": {
            "gpu_model": "AWS Inferentia",
            "compute_capability": 0,
            "gpu_count": 16,
            "gpu_memory": 512,
        },
        "inf1.xlarge": {
            "gpu_model": "AWS Inferentia",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 0,
        },
        "inf1.2xlarge": {
            "gpu_model": "AWS Inferentia",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 0,
        },
        "inf1.6xlarge": {
            "gpu_model": "AWS Inferentia",
            "compute_capability": 0,
            "gpu_count": 4,
            "gpu_memory": 0,
        },
        "inf1.24xlarge": {
            "gpu_model": "AWS Inferentia",
            "compute_capability": 0,
            "gpu_count": 16,
            "gpu_memory": 0,
        },
        "inf2.xlarge": {
            "gpu_model": "AWS Inferentia2",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 32,
        },
        "inf2.8xlarge": {
            "gpu_model": "AWS Inferentia2",
            "compute_capability": 0,
            "gpu_count": 1,
            "gpu_memory": 32,
        },
        "inf2.24xlarge": {
            "gpu_model": "AWS Inferentia2",
            "compute_capability": 0,
            "gpu_count": 6,
            "gpu_memory": 192,
        },
        "inf2.48xlarge": {
            "gpu_model": "AWS Inferentia2",
            "compute_capability": 0,
            "gpu_count": 12,
            "gpu_memory": 384,
        },
        "p5.48xlarge": {
            "gpu_model": "NVIDIA H100",
            "compute_capability": 9.0,
            "gpu_count": 8,
            "cuda_cores": 18432,
            "gpu_memory": 640,
        },
    }
    for inst in instances:
        if inst.GPU == 0:
            continue
        if inst.instance_type not in gpu_data:
            print(
                f"WARNING: instance {inst.instance_type} has GPUs but is missing from gpu_data "
                "dict in scrape.add_gpu_info. The dict needs to be updated manually."
            )
            continue
        inst_gpu_data = gpu_data[inst.instance_type]
        inst.GPU = inst_gpu_data["gpu_count"]
        inst.GPU_model = inst_gpu_data["gpu_model"]
        inst.compute_capability = inst_gpu_data["compute_capability"]
        inst.GPU_memory = inst_gpu_data["gpu_memory"]


def add_availability_zone_info(instances):
    """
    Add info about availability zones using information from the following APIs:
        - aws ec2 describe-instance-type-offerings --region us-east-1
        - aws ec2 describe-instance-type-offerings --location-type availability-zone --region us-east-1
        - aws ec2 describe-availability-zones --region us-east-1
    https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-type-offerings.html
    """
    instance_type_region_availability_zones = {}
    for region_name in ec2.describe_regions():
        for offering in ec2.describe_instance_type_offerings(
            region_name=region_name, location_type="availability-zone-id"
        ):
            instance_type = offering["InstanceType"]
            availability_zone_id = offering["Location"]
            region_availability_zones = instance_type_region_availability_zones.get(
                instance_type, {}
            )
            availability_zones = region_availability_zones.get(region_name, [])
            if availability_zone_id not in availability_zones:
                availability_zones.append(availability_zone_id)
                availability_zones.sort()
                region_availability_zones[region_name] = availability_zones
                instance_type_region_availability_zones[instance_type] = (
                    region_availability_zones
                )
    for inst in instances:
        inst.availability_zones = instance_type_region_availability_zones.get(
            inst.instance_type, {}
        )


def add_placement_groups(instances):
    """
    See https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html#placement-groups-limitations-cluster
    for the logic on which instances support placement groups.
    """
    placement_group_data = {
        "prev_gen_families": [
            "a1",
            "c3",
            "g2",
            "i2",
            "r3",
        ],
        "prev_gen_instances": [
            "cc2.8xlarge",
            "cr1.8xlarge",
            "hs1.8xlarge",
        ],
        "exceptions": [
            "t2",
            "t3",
            "t4",
            "ma",
        ],
    }

    for inst in instances:
        itype = inst.instance_type
        excpt = placement_group_data["exceptions"]
        prev_geni = placement_group_data["prev_gen_instances"]
        prev_genf = placement_group_data["prev_gen_families"]
        if itype[0:2] in excpt:
            inst.placement_group_support = False
        elif (
            inst.generation == "previous"
            and itype not in prev_geni
            and itype[0:2] not in prev_genf
        ):
            inst.placement_group_support = False


def add_dedicated_info(instances):
    """Add dedicated host pricing information to instances"""
    logger = logging.getLogger('add_dedicated_info')
    
    try:
        # Create price collector and fetch prices
        collector = DedicatedPriceCollector(max_workers=10)
        all_pricing = collector.fetch_dedicated_prices()
        
        region_map = {value: key for key, value in ec2.get_region_descriptions().items()}
        region_map["us-gov-west-1"] = "AWS GovCloud (US)"
        region_map["us-west-2-lax"] = "US West (Los Angeles)"
        
        # Update instance pricing information
        for inst in instances:
            if not inst.pricing:
                # Handle instances that are ONLY available with dedicated host pricing
                inst_type = inst.instance_type.split(".")[0]
                for k, r in region_map.items():
                    region = ec2.canonicalize_location(r, False)
                    if region in all_pricing and inst_type in all_pricing[region]:
                        _price = all_pricing[region][inst_type]
                        inst.regions[k] = region
                        inst.pricing[k] = {}
                        inst.pricing[k]["dedicated"] = _price
            else:
                # Add dedicated pricing to instances with existing pricing info
                for region in inst.pricing:
                    try:
                        _price = all_pricing[region_map[region]][
                            inst.instance_type.split(".")[0]
                        ]
                        inst.pricing[region]["dedicated"] = _price
                    except KeyError:
                        pass
                        
    except Exception as e:
        logger.error(f"Error adding dedicated host information: {str(e)}")
        raise

def add_spot_interrupt_info(instances):
    """
    add spot interrupt info for linux/windows instances in supported regions
    see: https://aws.amazon.com/ec2/spot/instance-advisor/
    """
    os_keys = (("Windows", "mswin"), ("Linux", "linux"))
    freq = ["<5%", "5-10%", "10-15%", "15-20%", ">20%"]
    response = requests.get(
        "https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json"
    )
    data = response.json()
    spot_advisor = data["spot_advisor"]
    spot_interrupt = {}
    for region, regional_data in spot_advisor.items():
        spot_interrupt[region] = {}
        for os_key, os_id in os_keys:
            spot_interrupt[region][os_id] = {}
            for instance, info in regional_data[os_key].items():
                spot_interrupt[region][os_id][instance] = {
                    "r": info["r"],
                    "s": info["s"],
                }

    for instance in instances:
        for region in instance.pricing:
            for _, os_id in os_keys:
                if (
                    region in spot_interrupt
                    and os_id in spot_interrupt[region]
                    and instance.instance_type in spot_interrupt[region][os_id]
                    and region in instance.pricing
                    and os_id in instance.pricing[region]
                ):
                    spot_data = spot_interrupt[region][os_id][instance.instance_type]
                    instance.pricing[region][os_id]["pct_interrupt"] = freq[
                        spot_data["r"]
                    ]
                    instance.pricing[region][os_id]["pct_savings_od"] = spot_data["s"]

                    # convert percent savings to price
                    est_spot = (
                        0.01
                        * (100 - spot_data["s"])
                        * float(instance.pricing[region][os_id]["ondemand"])
                    )
                    instance.pricing[region][os_id]["spot_avg"] = f"{est_spot:.6f}"

class InstanceScraper:
    def __init__(self, max_workers=10):
        self.logger = logging.getLogger('scraper.InstanceScraper')
        self.scraper = ParallelScraper(max_workers=max_workers)
        self.regions = list(ec2.describe_regions())
        self.instance_map = {}
        self.all_instances = []

    def _process_instance_info(self, instance_info):
        """Process raw instance information into an Instance object"""
        try:
            inst = Instance()
            inst.instance_type = instance_info['InstanceType']
            inst.api_description = instance_info

            # Process CPU info
            if 'ProcessorInfo' in instance_info:
                inst.arch = instance_info['ProcessorInfo']['SupportedArchitectures']
                if 'SustainedClockSpeedInGhz' in instance_info['ProcessorInfo']:
                    inst.clock_speed_ghz = str(instance_info['ProcessorInfo']['SustainedClockSpeedInGhz'])

            # Process memory info
            if 'MemoryInfo' in instance_info:
                inst.memory = instance_info['MemoryInfo']['SizeInMiB'] / 1024.0

            # Process vCPU info
            if 'VCpuInfo' in instance_info:
                inst.vCPU = instance_info['VCpuInfo']['DefaultVCpus']

            # Process network info
            if 'NetworkInfo' in instance_info:
                net_info = instance_info['NetworkInfo']
                inst.network_performance = net_info['NetworkPerformance']
                if net_info.get('EnaSupport') == 'required':
                    inst.ebs_as_nvme = True
                inst.vpc = {
                    'max_enis': net_info['MaximumNetworkInterfaces'],
                    'ips_per_eni': net_info['Ipv4AddressesPerInterface']
                }

            return inst
        except Exception as e:
            self.logger.error(f"Error processing instance info for {instance_info.get('InstanceType', 'unknown')}: {str(e)}")
            raise

    def collect_instance_data(self):
        """Collect basic instance type information"""
        self.logger.info("Starting instance data collection...")
        try:
            instance_data = self.scraper.parallel_instance_fetch(self.regions)
            processed = 0

            for region, instances in instance_data.items():
                self.logger.debug(f"Processing {len(instances)} instances from {region}")
                for instance_info in instances:
                    instance_type = instance_info['InstanceType']
                    if instance_type not in self.instance_map:
                        inst = self._process_instance_info(instance_info)
                        self.instance_map[instance_type] = inst
                        self.all_instances.append(inst)
                    processed += 1

            self.logger.info(f"Completed instance data collection. Found {len(self.instance_map)} unique instance types")

        except Exception as e:
            self.logger.error(f"Failed to collect instance data: {str(e)}", exc_info=True)
            raise

    def collect_pricing_data(self):
        """Collect pricing information using parallel processing"""
        self.logger.info("Starting parallel pricing data collection...")
        try:
            # Create pricing collector instance
            collector = ParallelPricingCollector(max_workers=10)

            # Collect pricing data in parallel
            collector.collect_pricing(self.all_instances, self.regions)

            self.logger.info("Completed parallel pricing data collection")

        except Exception as e:
            self.logger.error(f"Failed to collect pricing data: {str(e)}")
            raise

    def collect_additional_info(self):
        """Collect all additional instance information"""
        try:
            self.logger.info("Collecting additional instance information...")

            # ENI info
            self.logger.info("Adding ENI information...")
            add_eni_info(self.all_instances)

            # Linux AMI info
            self.logger.info("Adding Linux AMI information...")
            add_linux_ami_info(self.all_instances)

            # VPC only info
            self.logger.info("Adding VPC-only information...")
            add_vpconly_detail(self.all_instances)

            # Instance storage
            self.logger.info("Adding instance storage details...")
            add_instance_storage_details(self.all_instances)

            # T2 credits
            self.logger.info("Adding T2 credit information...")
            add_t2_credits(self.all_instances)

            # Pretty names
            self.logger.info("Adding pretty names...")
            add_pretty_names(self.all_instances)

            # EMR info
            self.logger.info("Adding EMR details...")
            add_emr_info(self.all_instances)

            # GPU info
            self.logger.info("Adding GPU details...")
            add_gpu_info(self.all_instances)

            # Placement groups
            self.logger.info("Adding placement group details...")
            add_placement_groups(self.all_instances)

            # Dedicated host pricing
            self.logger.info("Adding dedicated host pricing...")
            add_dedicated_info(self.all_instances)

            # Spot interrupt info
            self.logger.info("Adding spot interrupt details...")
            add_spot_interrupt_info(self.all_instances)

            self.logger.info("Completed collecting additional information")

        except Exception as e:
            self.logger.error(f"Failed to collect additional information: {str(e)}", exc_info=True)
            raise

    def scrape_all(self):
        """Execute complete scraping process"""
        try:
            self.logger.info("Starting complete scraping process")

            # Collect instance data
            self.collect_instance_data()

            # Collect pricing data
            self.collect_pricing_data()

            # Collect additional information
            self.collect_additional_info()

            self.logger.info("Completed scraping process successfully")

        except Exception as e:
            self.logger.error(f"Error during scraping process: {str(e)}")
            raise

def scrape(data_file):
    """Main scraping function with improved error handling"""
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"Starting EC2 instance scraping process for {data_file}")
        scraper = InstanceScraper(max_workers=10)
        scraper.scrape_all()

        # Save results
        logger.info(f"Saving results to {data_file}")
        os.makedirs(os.path.dirname(data_file), exist_ok=True)
        with open(data_file, "w") as f:
            json.dump([i.to_dict() for i in scraper.all_instances], f, indent=1)

        logger.info("EC2 instance scraping process completed successfully")

    except Exception as e:
        logger.error(f"Failed to complete EC2 instance scraping process: {str(e)}")
        logger.debug(traceback.format_exc())
        raise

if __name__ == "__main__":
    scrape("www/instances.json")
