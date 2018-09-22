#!/usr/bin/env python
from lxml import etree
import urllib2
import re
import json
import locale

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
        self.vpc_only = False
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


def parse_prev_generation_instance(tr):
    i = Instance()
    cols = tr.xpath('td')
    assert len(cols) == 8, "Expected 8 columns in the table, but got %d" % len(cols)
    i.family = totext(cols[0])
    i.instance_type = totext(cols[1]).strip("*")
    archs = totext(cols[2])
    i.arch = []
    if '32-bit' in archs:
        i.arch.append('i386')
    if '64-bit' in archs:
        i.arch.append('x86_64')
    assert i.arch, "No archs detected: %s" % (archs,)
    i.vCPU = locale.atoi(totext(cols[3]))
    i.memory = locale.atof(totext(cols[4]))
    i.ebs_optimized = totext(cols[6]).lower() == 'yes'
    i.network_performance = totext(cols[7])
    i.enhanced_networking = False
    i.generation = 'previous'
    # print "Parsed %s..." % (i.instance_type)
    return i


def parse_instance(tr, inst2family):
    i = Instance()
    cols = tr.xpath('td')
    assert (len(cols) == 12 or len(cols) == 13), "Expected 12 or 13 columns in the table, but got %d" % len(cols)

    ebs_optimized_col = 10
    enhanced_networking_col = 11

    # The "Compute Optimized" group table has an extra column
    # FIXME: This kind of complexity is not good. Should try to detect the
    #        column contents by the names in their headers.
    if len(cols) == 13:
        ebs_optimized_col = 11
        enhanced_networking_col = 12

    i.instance_type = sanitize_instance_type(totext(cols[0]))
    i.family = inst2family.get(i.instance_type, "Unknown")
    # Some instances support 32-bit arch
    # http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-resize.html#resize-limitations
    supports_32bit = (
        't2.nano',
        't2.micro',
        't2.small',
        't2.medium',
        'c3.large',
        't1.micro',
        'm1.small',
        'm1.medium',
        'c1.medium')
    if i.instance_type in supports_32bit:
        i.arch.append('i386')
    try:
        i.vCPU = locale.atoi(totext(cols[1]))
    except ValueError:
        i.vCPU = "N/A"
    i.memory = locale.atof(totext(cols[2]))
    i.network_performance = totext(cols[4])
    i.ebs_optimized = totext(cols[ebs_optimized_col]).lower() == 'yes'
    i.enhanced_networking = totext(cols[enhanced_networking_col]).lower() == 'yes'
    i.generation = 'current'
    # print "Parsed %s..." % (i.instance_type)
    return i


def _rindex_family(inst2family, details):
    rows = details.xpath('tr')[0:]
    for r in rows:
        cols = r.xpath('th') or r.xpath('td')
        for i in totext(cols[1]).split('|'):
            i = i.strip()
            inst2family[i] = totext(cols[0])


def feature_support(details, types):
    rows = details.xpath('tr')[0:]
    for r in rows:
        cols = r.xpath('th') or r.xpath('td')
        if totext(cols[4]).lower() == 'yes':
            family = totext(cols[0]).lower() + "."
            for i in types:
                if i.instance_type.startswith(family):
                    i.placement_group_support = True


def parse_gpus(tr, by_type):
    cols = tr.xpath('td')
    instance_type = totext(cols[0])
    instance = by_type.get(instance_type, None)
    if instance is None:
        return
    instance.GPU = locale.atoi(totext(cols[1]))


def parse_instance_fpgas(tr, by_type):
    cols = tr.xpath('td')
    instance_type = totext(cols[0])
    instance = by_type.get(instance_type, None)
    if instance is None:
        return
    instance.FPGA = totext(cols[1])


def scrape_instances():
    inst2family = dict()
    tree = etree.parse(urllib2.urlopen("http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html"),
                       etree.HTMLParser())
    details = tree.xpath('//div[@class="table-contents"]//table')[0]
    hdrs = details.xpath('tr')[0]
    if totext(hdrs[0]).lower() == 'instance family' and 'current generation' in totext(hdrs[1]).lower():
        _rindex_family(inst2family, details)
    details = tree.xpath('//div[@class="table-contents"]//table')[1]
    hdrs = details.xpath('tr')[0]
    if totext(hdrs[0]).lower() == 'instance family' and 'previous generation' in totext(hdrs[1]).lower():
        _rindex_family(inst2family, details)
    assert len(inst2family) > 0, "Failed to find instance family info"
    features_details = tree.xpath('//div[@class="table-contents"]//table')[2]

    current_gen = []
    tree = etree.parse(urllib2.urlopen("http://aws.amazon.com/ec2/instance-types/"), etree.HTMLParser())
    details_tables = tree.xpath('//table[count(tbody/tr[1]/td)>=12]')
    for details in details_tables:
        rows = details.xpath('tbody/tr')[1:]
        current_gen.extend([parse_instance(r, inst2family) for r in rows])
    by_type = {i.instance_type: i for i in current_gen}

    for t in tables_with_column(tree, "GPUs"):
        for r in t.xpath('tbody/tr')[1:]:
            parse_gpus(r, by_type)

    for t in tables_with_column(tree, "FPGAs"):
        for r in t.xpath('tbody/tr')[1:]:
            parse_instance_fpgas(r, by_type)

    tree = etree.parse(urllib2.urlopen("http://aws.amazon.com/ec2/previous-generation/"), etree.HTMLParser())
    details = tree.xpath('//table')[7]
    rows = details.xpath('tbody/tr')[1:]
    assert len(rows) > 0, "Didn't find any table rows."
    prev_gen = [parse_prev_generation_instance(r) for r in rows]

    all_gen = prev_gen + current_gen

    hdrs = features_details.xpath('tr')[0]
    if totext(hdrs[0]).lower() == '' and 'enhanced networking' in totext(hdrs[5]).lower():
        feature_support(features_details, all_gen)

    return all_gen


def tables_with_column(tree, column_text):
    tables = tree.xpath("//table[.//tr[td//text()[contains(., '{}')]]]".format(column_text))
    assert len(tables) > 0, "Found no tables with '{}' column."
    return tables


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


def add_pricing(imap, data, platform, pricing_mode):
    if pricing_mode == 'od':
        add_ondemand_pricing(imap, data, platform)
    elif pricing_mode == 'ri':
        add_reserved_pricing(imap, data, platform)


def add_ondemand_pricing(imap, data, platform):
    for region_spec in data['config']['regions']:
        region = transform_region(region_spec['region'])
        for t_spec in region_spec['instanceTypes']:
            typename = t_spec['type']
            for i_spec in t_spec['sizes']:
                i_type = i_spec['size']
                if i_type not in imap:
                    print("ERROR: Got ondemand pricing data for unknown instance type {} in region {}".format(i_type, region))
                    continue
                inst = imap[i_type]
                inst.pricing.setdefault(region, {})
                # print "%s/%s" % (region, i_type)

                inst.pricing[region].setdefault(platform, {})
                for col in i_spec['valueColumns']:
                    inst.pricing[region][platform]['ondemand'] = col['prices']['USD']

                # ECU is only available here
                try:
                    inst.ECU = locale.atof(i_spec['ECU'])
                except:
                    # these are likely instances with 'variable' ECU
                    inst.ECU = i_spec['ECU']


def add_reserved_pricing(imap, data, platform):
    for region_spec in data['config']['regions']:
        region = transform_region(region_spec['region'])
        for t_spec in region_spec['instanceTypes']:
            i_type = t_spec['type']
            if i_type not in imap:
                print("ERROR: Got reserved pricing data for unknown instance type {} in region {}".format(i_type, region))
                continue
            inst = imap[i_type]
            inst.pricing.setdefault(region, {})
            # print "%s/%s" % (region, i_type)
            inst.pricing[region].setdefault(platform, {})
            inst.pricing[region][platform].setdefault('reserved', {})

            termPricing = {}

            for term in t_spec['terms']:
                for po in term['purchaseOptions']:
                    for value in po['valueColumns']:
                        if value['name'] == 'effectiveHourly':
                            termPricing[term['term'] + '.' + po['purchaseOption']] = value['prices']['USD']

            inst.pricing[region][platform]['reserved'] = termPricing


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
    pricing_modes = ['ri', 'od']

    reserved_name_map = {
        'linux': 'linux-unix-shared',
        'rhel': 'red-hat-enterprise-linux-shared',
        'sles': 'suse-linux-shared',
        'mswin': 'windows-shared',
        'mswinSQL': 'windows-with-sql-server-standard-shared',
        'mswinSQLWeb': 'windows-with-sql-server-web-shared',
        'mswinSQLEnterprise': 'windows-with-sql-server-enterprise-shared',
        'linuxSQL': 'linux-with-sql-server-standard-shared',
        'linuxSQLWeb': 'linux-with-sql-server-web-shared',
        'linuxSQLEnterprise':' linux-with-sql-server-enterprise-shared'
    }

    for i in instances:
        i.pricing = {}

    by_type = {i.instance_type: i for i in instances}

    for platform in ['linux', 'rhel', 'sles', 'mswin', 'mswinSQL', 'mswinSQLWeb', 'mswinSQLEnterprise', 'linuxSQL', 'linuxSQLWeb', 'linuxSQLEnterprise']:
        for pricing_mode in pricing_modes:
            # current generation
            if pricing_mode == 'od':
                pricing_url = 'https://a0.awsstatic.com/pricing/1/deprecated/ec2/%s-od.json' % (platform,)
            else:
                pricing_url = 'http://a0.awsstatic.com/pricing/1/ec2/ri-v2/%s.min.js' % (reserved_name_map[platform],)

            pricing = fetch_data(pricing_url)
            add_pricing(by_type, pricing, platform, pricing_mode)

            # previous generation
            if pricing_mode == 'od':
                pricing_url = 'http://a0.awsstatic.com/pricing/1/ec2/previous-generation/%s-od.min.js' % (platform,)
            else:
                pricing_url = 'http://a0.awsstatic.com/pricing/1/ec2/previous-generation/ri-v2/%s.min.js' % (
                    reserved_name_map[platform],)

            pricing = fetch_data(pricing_url)
            add_pricing(by_type, pricing, platform, pricing_mode)

    # EBS cost surcharge as per https://aws.amazon.com/ec2/pricing/on-demand/#EBS-Optimized_Instances
    ebs_pricing_url = 'https://a0.awsstatic.com/pricing/1/ec2/pricing-ebs-optimized-instances.min.js'
    pricing = fetch_data(ebs_pricing_url)
    add_ebs_pricing(by_type, pricing)


def fetch_data(url):
    content = urllib2.urlopen(url).read()
    try:
        pricing = json.loads(content)
    except ValueError:
        # if the data isn't compatible JSON, try to parse as jsonP
        json_string = re.sub(r"(\w+):", r'"\1":',
                             content[content.index('callback(') + 9: -2])  # convert into valid json
        pricing = json.loads(json_string)

    return pricing


def add_eni_info(instances):
    eni_url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html"
    tree = etree.parse(urllib2.urlopen(eni_url), etree.HTMLParser())
    table = tree.xpath('//div[@class="table-contents"]//table')[0]
    rows = table.xpath('.//tr[./td]')
    by_type = {i.instance_type: i for i in instances}

    for r in rows:
        instance_type = etree.tostring(r[0], method='text').strip()
        max_enis = locale.atoi(etree.tostring(r[1], method='text'))
        ip_per_eni = locale.atoi(etree.tostring(r[2], method='text'))
        if instance_type not in by_type:
            print("Unknown instance type: {}".format(instance_type))
            continue
        by_type[instance_type].vpc = {
            'max_enis': max_enis,
            'ips_per_eni': ip_per_eni}


def add_ebs_info(instances):
    ebs_url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSOptimized.html"
    tree = etree.parse(urllib2.urlopen(ebs_url), etree.HTMLParser())
    table = tree.xpath('//div[@class="table-contents"]//table')[0]
    rows = table.xpath('tr')
    by_type = {i.instance_type: i for i in instances}

    for row in rows:
        if row.xpath('th'):
            continue

        cols = row.xpath('td')
        # TODO: Support the asterisk, which means: "These instance types can support maximum
        # performance for 30 minutes at least once every 24 hours. For example, c5.large
        # instances can deliver 281 MB/s for 30 minutes at least once every 24 hours. If you
        # have a workload that requires sustained maximum performance for longer than 30
        # minutes, select an instance type based on the following baseline performance."
        instance_type = sanitize_instance_type(totext(cols[0]).replace("*", ""))
        ebs_optimized_by_default = totext(cols[1]) == 'Yes'
        ebs_max_bandwidth = locale.atof(totext(cols[2]))
        ebs_throughput = locale.atof(totext(cols[3]))
        ebs_iops = locale.atof(totext(cols[4]))
        if instance_type not in by_type:
            print("Unknown instance type: {}".format(instance_type))
            continue
        by_type[instance_type].ebs_optimized_by_default = ebs_optimized_by_default
        by_type[instance_type].ebs_throughput = ebs_throughput
        by_type[instance_type].ebs_iops = ebs_iops
        by_type[instance_type].ebs_max_bandwidth = ebs_max_bandwidth


def check_ebs_as_nvme(instances):
    """Note which instances expose EBS as NVMe devices

    Some of the new instances (like i3.metal and c5d family) will expose EBS
    volume at /dev/nvmeXn1.
    https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/nvme-ebs-volumes.html
    """

    url = 'https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/nvme-ebs-volumes.html'
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())

    # This should get the p text with instance families
    p_text = ' '.join(s.strip() for s in tree.xpath(r'//*[@id="main-col-body"]/p[1]/text()'))
    families = [fam.lower() for fam in re.findall(r'[a-zA-Z]\d[a-z]?', p_text)]

    # This should get all code tags which suppose to contain an instance type
    instance_types = tree.xpath(r'//*[@id="main-col-body"]/p[1]/code//text()')

    for inst in instances:
        inst_family = inst.instance_type.partition('.')[0]
        if inst.instance_type in instance_types or inst_family in families:
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
            if totext(r[3]) == checkmark_char:
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
    # specific instances can be lanuched in VPC only
    # http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-vpc.html#vpc-only-instance-types
    vpc_only_families = ('c5', 'c5d', 'c4', 'f1', 'g3', 'h1', 'i3', 'm4', 'm5', 'm5d', 'p2', 'r4', 't2', 'x1')
    for i in instances:
        for family in vpc_only_families:
            if i.instance_type.startswith(family):
                i.vpc_only = True


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


def add_cpu_details(instances):
    def clean_output(x):
        return {
            '': None,
            '-': None,
            'Yes': True,
            'yes': True,
            'No': False,
            'no': False,
        }.get(x, x)

    def text_for(element):
        return "".join(element.itertext())

    by_type = {i.instance_type: i for i in instances}
    url = "https://aws.amazon.com/ec2/instance-types/#instance-type-matrix"
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())
    tables = tree.xpath('//div[@class="aws-table"]//table')
    tables = filter(lambda x: text_for(x.xpath('.//tr//td')[0]) == 'Instance Type', tables)
    for t in tables:
        header_row = t.xpath('.//tr')[0]
        intel_avx_idx = -1
        intel_avx2_idx = -1
        intel_avx512_idx = -1
        intel_turbo_idx = -1
        for idx, c in enumerate(header_row):
            text = text_for(c)
            if "Intel AVX-512" in text:
                intel_avx512_idx = idx
            elif "Intel AVX2" in text:
                intel_avx2_idx = idx
            elif "Intel AVX" in text:
                intel_avx_idx = idx
            elif "Intel Turbo" in text:
                intel_turbo_idx = idx
        rows = [r for r in t.xpath('.//tr') if not text_for(r[0]) == 'Instance Type']
        for r in rows:
            instance_type = sanitize_instance_type(etree.tostring(r[0], method='text'))
            instance = by_type.get(instance_type)
            if not instance:
                print("Unknown instance type: {}".format(instance_type))
                continue
            instance.physical_processor = clean_output(totext(r[5]))
            instance.clock_speed_ghz = clean_output(totext(r[6]))
            if intel_avx_idx != -1:
                instance.intel_avx = clean_output(totext(r[intel_avx_idx]))
            if intel_avx2_idx != -1:
                instance.intel_avx2 = clean_output(totext(r[intel_avx2_idx]))
            if intel_avx512_idx != -1:
                instance.intel_avx512 = clean_output(totext(r[intel_avx512_idx]))
            if intel_turbo_idx != -1:
                instance.intel_turbo = clean_output(totext(r[intel_turbo_idx]))


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


def scrape(data_file):
    """Scrape AWS to get instance data"""
    print("Parsing instance types...")
    all_instances = scrape_instances()
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
    print("Parsing instance cpu details...")
    add_cpu_details(all_instances)
    print("Parsing emr details...")
    add_emr_info(all_instances)

    with open(data_file, 'w') as f:
        json.dump([i.to_dict() for i in all_instances],
                  f,
                  indent=2,
                  sort_keys=True,
                  separators=(',', ': '))


if __name__ == '__main__':
    scrape('www/instances.json')
