#!/usr/bin/env python
from lxml import etree
import re
import json
import locale
import ec2

from six.moves.urllib import request as urllib2

# Following advice from https://stackoverflow.com/a/1779324/216138
# The locale must be installed in the system, and it must be one where ',' is
# the thousans separator and '.' is the decimal fraction separator.
locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')


class Instance(object):
    def __init__(self):
        self.arch = ['x86_64']
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
        self.ECU = 0
        self.enhanced_networking = None
        self.family = ''
        self.FPGA = 0
        self.generation = None
        self.GPU = 0
        self.GPU_memory = 0
        self.GPU_model = None
        self.includes_swap_partition = False
        self.instance_type = ''
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
        self.placement_group_support = False
        self.pretty_name = ''
        self.pricing = {}
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
        ipv4_only_families = ("cg1", "m1", "m3", "c1", "cc2", "g2", "m2", "cr1", "hs1", "t1")
        return self.get_type_prefix() not in ipv4_only_families

    def to_dict(self):
        d = dict(family=self.family,
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
                 emr=self.emr)
        if self.ebs_only:
            d['storage'] = None
        else:
            d['storage'] = dict(ssd=self.ssd,
                                trim_support=self.trim_support,
                                nvme_ssd=self.nvme_ssd,
                                storage_needs_initialization=self.storage_needs_initialization,
                                includes_swap_partition=self.includes_swap_partition,
                                devices=self.num_drives,
                                size=self.drive_size)
        return d

    def __repr__(self):
        return "<Instance {}>".format(self.instance_type)


def sanitize_instance_type(instance_type):
    """Typos and other bad data are common in the instance type colums for some reason"""
    # Remove random whitespace
    instance_type = re.sub(r"\s+", "", instance_type, flags=re.UNICODE)

    # Correct typos
    typo_corrections = {
        "x1.16large": "x1.16xlarge",  # https://github.com/powdahound/ec2instances.info/issues/199
        "i3.4xlxarge": "i3.4xlarge",  # https://github.com/powdahound/ec2instances.info/issues/227
        "i3.16large": "i3.16xlarge",  # https://github.com/powdahound/ec2instances.info/issues/227
    }
    return typo_corrections.get(instance_type, instance_type)


def totext(elt):
    s = etree.tostring(elt, method='text', encoding='unicode').strip()
    return re.sub(r'\*\d$', '', s)


def transform_size(size):
    if size == 'u':
        return 'micro'
    if size == 'sm':
        return 'small'
    if size == 'med':
        return 'medium'
    m = re.search('^(x+)l$', size)
    if m:
        xs = len(m.group(1))
        if xs == 1:
            return 'xlarge'
        else:
            return str(xs) + 'xlarge'
    assert size == 'lg', "Unable to parse size: %s" % (size,)
    return 'large'


def transform_region(reg):
    region_map = {
        'eu-ireland': 'eu-west-1',
        'eu-frankfurt': 'eu-central-1',
        'apac-sin': 'ap-southeast-1',
        'apac-syd': 'ap-southeast-2',
        'apac-tokyo': 'ap-northeast-1'}
    if reg in region_map:
        return region_map[reg]
    m = re.search(r'^([^0-9]*)(-(\d))?$', reg)
    assert m, "Can't parse region: %s" % (reg,)
    base = m.group(1)
    num = m.group(3) or '1'
    return base + "-" + num


def add_ebs_pricing(imap, data):
    for region_spec in data['config']['regions']:
        region = transform_region(region_spec['region'])
        for t_spec in region_spec['instanceTypes']:
            typename = t_spec['type']
            for i_spec in t_spec['sizes']:
                i_type = i_spec['size']
                if i_type not in imap:
                    print("ERROR: Got EBS pricing data for unknown instance type: {}".format(i_type))
                    continue
                inst = imap[i_type]
                inst.pricing.setdefault(region, {})
                # print "%s/%s" % (region, i_type)

                for col in i_spec['valueColumns']:
                    inst.pricing[region]['ebs'] = col['prices']['USD']


def add_pricing_info(instances):

    for i in instances:
        i.pricing = {}

    by_type = {i.instance_type: i for i in instances}
    ec2.add_pricing(by_type)

    # EBS cost surcharge as per https://aws.amazon.com/ec2/pricing/on-demand/#EBS-Optimized_Instances
    ebs_pricing_url = 'https://a0.awsstatic.com/pricing/1/ec2/pricing-ebs-optimized-instances.min.js'
    pricing = fetch_data(ebs_pricing_url)
    add_ebs_pricing(by_type, pricing)


def fetch_data(url):
    content = urllib2.urlopen(url).read().decode()
    try:
        pricing = json.loads(content)
    except ValueError:
        # if the data isn't compatible JSON, try to parse as jsonP
        json_string = re.search(r'callback\((.*)\);', content).groups()[0]  # extract javascript object
        json_string = re.sub(r"(\w+):", r'"\1":', json_string)  # convert to json
        pricing = json.loads(json_string)

    return pricing


def add_eni_info(instances):
    eni_url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html"
    tree = etree.parse(urllib2.urlopen(eni_url), etree.HTMLParser())
    table = tree.xpath('//div[@class="table-contents"]//table')[0]
    rows = table.xpath('.//tr[./td]')
    by_type = {i.instance_type: i for i in instances}

    for r in rows:
        instance_type = etree.tostring(r[0], method='text').strip().decode()
        max_enis = locale.atoi(etree.tostring(r[1], method='text').decode())
        ip_per_eni = locale.atoi(etree.tostring(r[2], method='text').decode())
        if instance_type not in by_type:
            print("Unknown instance type: {}".format(instance_type))
            continue
        by_type[instance_type].vpc = {
            'max_enis': max_enis,
            'ips_per_eni': ip_per_eni}


def add_ebs_info(instances):
    """
    Three tables on this page:

    1: EBS optimized by default
        Instance type | Maximum bandwidth (Mib/s) | Maximum throughput (MiB/s, 128 KiB I/O) | Maximum IOPS (16 KiB I/O)

    2: Baseline performance metrics for instances with asterisk (unsupported for now, see comment below)
        Instance type | Baseline bandwidth (Mib/s) | Baseline throughput (MiB/s, 128 KiB I/O) | Baseline IOPS (16 KiB I/O)

    3: Not EBS optimized by default
        Instance type | Maximum bandwidth (Mib/s) | Maximum throughput (MiB/s, 128 KiB I/O) | Maximum IOPS (16 KiB I/O)

    TODO: Support the asterisk on type names in the first table, which means:
        "These instance types can support maximum performance for 30 minutes at least once every 24 hours. For example,
        c5.large instances can deliver 281 MB/s for 30 minutes at least once every 24 hours. If you have a workload
        that requires sustained maximum performance for longer than 30 minutes, select an instance type based on the
        following baseline performance."

    """
    def parse_ebs_table(by_type, table, ebs_optimized_by_default):
        for row in table.xpath('tr'):
            if row.xpath('th'):
                continue
            cols = row.xpath('td')
            instance_type = sanitize_instance_type(totext(cols[0]).replace("*", ""))
            ebs_optimized_by_default = ebs_optimized_by_default
            ebs_max_bandwidth = locale.atof(totext(cols[1]))
            ebs_throughput = locale.atof(totext(cols[2]))
            ebs_iops = locale.atof(totext(cols[3]))
            if instance_type not in by_type:
                print(f"ERROR: Ignoring EBS info for unknown instance {instance_type}")
                by_type[instance_type] = Instance()
                # continue
            by_type[instance_type].ebs_optimized_by_default = ebs_optimized_by_default
            by_type[instance_type].ebs_throughput = ebs_throughput
            by_type[instance_type].ebs_iops = ebs_iops
            by_type[instance_type].ebs_max_bandwidth = ebs_max_bandwidth
        return by_type

    by_type = {i.instance_type: i for i in instances}
    ebs_url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSOptimized.html"
    tree = etree.parse(urllib2.urlopen(ebs_url), etree.HTMLParser())
    tables = tree.xpath('//div[@class="table-contents"]//table')
    parse_ebs_table(by_type, tables[0], True)
    parse_ebs_table(by_type, tables[2], False)


def check_ebs_as_nvme(instances):
    """Note which instances expose EBS as NVMe devices

    Some of the new instances (like i3.metal and c5d family) will expose EBS
    volume at /dev/nvmeXn1.
    https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html
    """

    url = 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html'
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())

    # This should get the p text with instance families
    p_text = ' '.join(text for p in tree.xpath(r'//*[@id="main-col-body"]/div[8]/ul/li[1]/p') for text in p.itertext())
    prefixes = [fam.lower() for fam in re.findall(r'[a-zA-Z]\d[a-z]*(?:\.[0-9a-z]+)?', p_text)]

    for inst in instances:
        if any(inst.instance_type.startswith(prefix) for prefix in prefixes):
            inst.ebs_as_nvme = True


def add_linux_ami_info(instances):
    """Add information about which virtualization options are supported.

    Note that only HVM is supported for Windows instances so that info is not
    given its own column.

    """
    checkmark_char = u'\u2713'
    url = "http://aws.amazon.com/amazon-linux-ami/instance-type-matrix/"
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())
    table = tree.xpath('//div[@class="aws-table"]/table')[0]
    rows = table.xpath('.//tr[./td]')[1:]  # ignore header

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
                supported_types.append('HVM')
            if len(r) >= 4 and totext(r[3]) == checkmark_char:
                supported_types.append('PV')
        except Exception as e:
            # 2018-08-01: handle missing cells on last row in this table...
            print("Exception while parsing AMI info for {}: {}".format(family_id, e))

        # Apply types for this instance family to all matching instances
        for i in instances:
            i_family_id = i.instance_type.split('.')[0]
            if i_family_id == family_id:
                i.linux_virtualization_types = supported_types

    # http://aws.amazon.com/amazon-linux-ami/instance-type-matrix/ page is
    # missing info about both older (t1, m1, c1, m2) and newer exotic (cg1,
    # cr1, hi1, hs1, cc2) instance type generations.

    # Adding "manual" info about older generations
    # Some background info at https://github.com/powdahound/ec2instances.info/pull/161
    for i in instances:
        i_family_id = i.instance_type.split('.')[0]
        if i_family_id in ('cc2', 'cg1', 'hi1', 'hs1'):
            if not 'HVM' in i.linux_virtualization_types:
                i.linux_virtualization_types.append('HVM')
        if i_family_id in ('t1', 'm1', 'm2', 'c1', 'hi1', 'hs1'):
            if not 'PV' in i.linux_virtualization_types:
                i.linux_virtualization_types.append('PV')


def add_vpconly_detail(instances):
    # A few legacy instances can be launched in EC2 Classic, the rest is VPC only
    # https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-classic-platform.html#ec2-classic-instance-types
    classic_families = ("m1", "m3", "t1", "c1", "c3", "cc2", "cr1", "m2", "r3", "d2", "hs1", "i2", "g2")
    for i in instances:
        for family in classic_families:
            if i.instance_type.startswith(family):
                i.vpc_only = False


def add_instance_storage_details(instances):
    """Add information about instance storage features."""

    url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html"
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())
    table = tree.xpath('//div[@class="table-contents"]/table')[0]
    rows = table.xpath('.//tr[./td]')

    checkmark_char = u'\u2714'
    dagger_char = u'\u2020'

    for r in rows:
        columns = r.xpath('.//td')

        (instance_type,
         storage_volumes,
         storage_type,
         needs_initialization,
         trim_support) = tuple(totext(i) for i in columns)

        if instance_type is None:
            continue

        for i in instances:
            if i.instance_type == instance_type:
                i.ebs_only = True

                m = re.search(r'(\d+)\s*x\s*([0-9,]+)?', storage_volumes)
                if m:
                    i.ebs_only = False
                    i.num_drives = locale.atoi(m.group(1))
                    i.drive_size = locale.atoi(m.group(2))
                    i.ssd = 'SSD' in storage_type
                    i.nvme_ssd = 'NVMe' in storage_type
                    i.trim_support = checkmark_char in trim_support
                    i.storage_needs_initialization = checkmark_char in needs_initialization
                    i.includes_swap_partition = dagger_char in storage_volumes


def add_t2_credits(instances):
    tree = etree.parse(
        urllib2.urlopen("http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/t2-credits-baseline-concepts.html"),
        etree.HTMLParser())
    table = tree.xpath('//div[@class="table-contents"]//table')[0]
    rows = table.xpath('.//tr[./td]')
    assert len(rows) > 0, "Failed to find T2 CPU credit info"

    by_type = {i.instance_type: i for i in instances}

    for r in rows:
        if len(r) > 1:
            inst = by_type[totext(r[0])]
            creds_per_hour = locale.atof(totext(r[1]))
            inst.base_performance = creds_per_hour / 60
            inst.burst_minutes = creds_per_hour * 24 / inst.vCPU


def add_pretty_names(instances):
    family_names = {
        'c1': 'C1 High-CPU',
        'c3': 'C3 High-CPU',
        'c4': 'C4 High-CPU',
        'c5': 'C5 High-CPU',
        'c5d': 'C5 High-CPU',
        'cc2': 'Cluster Compute',
        'cg1': 'Cluster GPU',
        'cr1': 'High Memory Cluster',
        'g4': 'G4 Accelerated Computing',
        'hi1': 'HI1. High I/O',
        'hs1': 'High Storage',
        'i3': 'I3 High I/O',
        'm1': 'M1 General Purpose',
        'm2': 'M2 High Memory',
        'm3': 'M3 General Purpose',
        'm4': 'M4 General Purpose',
        'm5': 'M5 General Purpose',
        'm5d': 'M5 General Purpose',
        'p2': 'General Purpose GPU',
        'r3': 'R3 High-Memory',
        'r4': 'R4 High-Memory',
        'x1': 'X1 Extra High-Memory'
    }
    for i in instances:
        pieces = i.instance_type.split('.')
        family = pieces[0]
        short = pieces[1]
        prefix = family_names.get(family, family.upper())
        extra = None
        if short.startswith('8x'):
            extra = 'Eight'
        elif short.startswith('4x'):
            extra = 'Quadruple'
        elif short.startswith('2x'):
            extra = 'Double'
        elif short.startswith('10x'):
            extra = 'Deca'
        elif short.startswith('x'):
            extra = ''
        bits = [prefix]
        if extra is not None:
            bits.extend([extra, 'Extra'])
            short = 'Large'

        bits.append(short.capitalize())

        i.pretty_name = ' '.join([b for b in bits if b])


def add_emr_info(instances):
    url = "https://a0.awsstatic.com/pricing/1/emr/pricing-emr.min.js"
    pricing = fetch_data(url)

    def extract_prices(data):
        ret = {}
        for x in data["regions"]:
            for inst in x["instanceTypes"]:
                for size in inst["sizes"]:
                    if size["size"] not in ret:
                        ret[size["size"]] = {}
                    ret[size["size"]][x["region"]] = {
                        size["valueColumns"][0]["name"]:
                        size["valueColumns"][0]["prices"]["USD"],
                        size["valueColumns"][1]["name"]:
                        size["valueColumns"][1]["prices"]["USD"],
                        "currencies": data["currencies"],
                        "rate": data["rate"],
                    }
        return ret

    pricing = extract_prices(pricing["config"])
    for inst in instances:
        if inst.instance_type in pricing:
            inst.emr = True
            for region in inst.pricing:
                if region in pricing[inst.instance_type]:
                    inst.pricing[region]["emr"] = pricing[
                        inst.instance_type][region]


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
    """
    gpu_data = {
        'g2.2xlarge': {
            # No longer listed in AWS docs linked above. Alternative source is
            # https://medium.com/@manku_timma1/part-1-g2-2xlarge-gpu-basics-805ad40a37a4
            # The model has 2 units, 4G of memory each, but AWS exposes only 1 unit per instance
            'gpu_model': 'NVIDIA GRID K520',
            'compute_capability': 3.0,
            'gpu_memory': 4
        },
        'g2.8xlarge': {
            # No longer listed in AWS docs linked above. Alternative source is
            # https://aws.amazon.com/blogs/aws/new-g2-instance-type-with-4x-more-gpu-power/
            'gpu_model': 'NVIDIA GRID K520',
            'compute_capability': 3.0,
            'gpu_memory': 32
        },
        'g3s.xlarge': {
            'gpu_model': 'NVIDIA Tesla M60',
            'compute_capability': 5.2,
            'gpu_memory': 8
        },
        'g3.4xlarge': {
            'gpu_model': 'NVIDIA Tesla M60',
            'compute_capability': 5.2,
            'gpu_memory': 8
        },
        'g3.8xlarge': {
            'gpu_model': 'NVIDIA Tesla M60',
            'compute_capability': 5.2,
            'gpu_memory': 16
        },
        'g3.16xlarge': {
            'gpu_model': 'NVIDIA Tesla M60',
            'compute_capability': 5.2,
            'gpu_memory': 32
        },
        'g4dn.xlarge': {
            'gpu_model': 'NVIDIA T4 Tensor Core',
            'compute_capability': 7.5,
            'gpu_memory': 16
        },
        'g4dn.2xlarge': {
            'gpu_model': 'NVIDIA T4 Tensor Core',
            'compute_capability': 7.5,
            'gpu_memory': 16
        },
        'g4dn.4xlarge': {
            'gpu_model': 'NVIDIA T4 Tensor Core',
            'compute_capability': 7.5,
            'gpu_memory': 16
        },
        'g4dn.8xlarge': {
            'gpu_model': 'NVIDIA T4 Tensor Core',
            'compute_capability': 7.5,
            'gpu_memory': 16
        },
        'g4dn.16xlarge': {
            'gpu_model': 'NVIDIA T4 Tensor Core',
            'compute_capability': 7.5,
            'gpu_memory': 16
        },
        'g4dn.12xlarge': {
            'gpu_model': 'NVIDIA T4 Tensor Core',
            'compute_capability': 7.5,
            'gpu_memory': 64
        },
        'p2.xlarge': {
            'gpu_model': 'NVIDIA Tesla K80',
            'compute_capability': 3.7,
            'gpu_memory': 12
        },
        'p2.8xlarge': {
            'gpu_model': 'NVIDIA Tesla K80',
            'compute_capability': 3.7,
            'gpu_memory': 96
        },
        'p2.16xlarge': {
            'gpu_model': 'NVIDIA Tesla K80',
            'compute_capability': 3.7,
            'gpu_memory': 192
        },
        'p3.2xlarge': {
            'gpu_model': 'NVIDIA Tesla V100',
            'compute_capability': 7.0,
            'gpu_memory': 16
        },
        'p3.8xlarge': {
            'gpu_model': 'NVIDIA Tesla V100',
            'compute_capability': 7.0,
            'gpu_memory': 64
        },
        'p3.16xlarge': {
            'gpu_model': 'NVIDIA Tesla V100',
            'compute_capability': 7.0,
            'gpu_memory': 128
        },
        'p3dn.24xlarge': {
            'gpu_model': 'NVIDIA Tesla V100',
            'compute_capability': 7.0,
            'gpu_memory': 256
        },
    }
    for inst in instances:
        if inst.GPU == 0:
            continue
        if inst.instance_type not in gpu_data:
            print('WARNING: instance %s has GPUs but is missing from gpu_data '
                  'dict in scrape.add_gpu_info. The dict needs to be updated '
                  'manually.')
            continue
        inst_gpu_data = gpu_data[inst.instance_type]
        inst.GPU_model = inst_gpu_data['gpu_model']
        inst.compute_capability = inst_gpu_data['compute_capability']
        inst.GPU_memory = inst_gpu_data['gpu_memory']


def scrape(data_file):
    """Scrape AWS to get instance data"""
    print("Parsing instance types...")
    all_instances = ec2.get_instances()
    print("Parsing pricing info...")
    add_pricing_info(all_instances)
    print("Parsing ENI info...")
    add_eni_info(all_instances)
    print("Parsing EBS info...")
    add_ebs_info(all_instances)
    print("Adding EBS as NVMe info...")
    check_ebs_as_nvme(all_instances)
    print("Parsing Linux AMI info...")
    add_linux_ami_info(all_instances)
    print("Parsing VPC-only info...")
    add_vpconly_detail(all_instances)
    print("Parsing local instance storage...")
    add_instance_storage_details(all_instances)
    print("Parsing burstable instance credits...")
    add_t2_credits(all_instances)
    print("Parsing instance names...")
    add_pretty_names(all_instances)
    print("Parsing emr details...")
    add_emr_info(all_instances)
    print("Adding GPU details...")
    add_gpu_info(all_instances)

    with open(data_file, 'w') as f:
        json.dump([i.to_dict() for i in all_instances],
                  f,
                  indent=2,
                  sort_keys=True,
                  separators=(',', ': '))


if __name__ == '__main__':
    scrape('www/instances.json')
