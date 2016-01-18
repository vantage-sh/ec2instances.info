#!/usr/bin/env python
from lxml import etree
import urllib2
import re
import json


class Instance(object):
    def __init__(self):
        self.vpc = None
        self.arch = ['x86_64']
        self.ECU = 0
        self.linux_virtualization_types = []
        self.ebs_throughput = 0
        self.ebs_iops = 0
        self.ebs_max_bandwidth = 0
        # self.hvm_only = False
        self.vpc_only = False

    def to_dict(self):
        d = dict(family=self.family,
                 instance_type=self.instance_type,
                 arch=self.arch,
                 vCPU=self.vCPU,
                 ECU=self.ECU,
                 memory=self.memory,
                 ebs_optimized=self.ebs_optimized,
                 ebs_throughput=self.ebs_throughput,
                 ebs_iops=self.ebs_iops,
                 ebs_max_bandwidth=self.ebs_max_bandwidth,
                 network_performance=self.network_performance,
                 enhanced_networking=self.enhanced_networking,
                 pricing=self.pricing,
                 vpc=self.vpc,
                 linux_virtualization_types=self.linux_virtualization_types,
                 generation=self.generation,
                 vpc_only=self.vpc_only)
        if self.ebs_only:
            d['storage'] = None
        else:
            d['storage'] = dict(ssd=self.ssd,
                                devices=self.num_drives,
                                size=self.drive_size)
        return d


def totext(elt):
    s = etree.tostring(elt, method='text', encoding='unicode').strip()
    return re.sub(r'\*\d$', '', s)


def parse_prev_generation_instance(tr):
    i = Instance()
    cols = tr.xpath('td')
    assert len(cols) == 8, "Expected 8 columns in the table, but got %d" % len(cols)
    i.family = totext(cols[0])
    i.instance_type = totext(cols[1])
    archs = totext(cols[2])
    i.arch = []
    if '32-bit' in archs:
        i.arch.append('i386')
    if '64-bit' in archs:
        i.arch.append('x86_64')
    assert i.arch, "No archs detected: %s" % (archs,)
    i.vCPU = int(totext(cols[3]))
    i.memory = float(totext(cols[4]))
    storage = totext(cols[5])
    m = re.search(r'(\d+)\s*x\s*([0-9,]+)?', storage)
    i.ssd = False
    if m:
        i.ebs_only = False
        i.num_drives = int(m.group(1))
        i.drive_size = int(m.group(2).replace(',', ''))
        i.ssd = 'SSD' in totext(cols[5])
    else:
        assert storage == 'EBS Only', "Unrecognized storage spec: %s" % (storage,)
        i.ebs_only = True
    i.ebs_optimized = totext(cols[6]).lower() == 'yes'
    i.network_performance = totext(cols[7])
    i.enhanced_networking = False
    i.generation = 'previous'
    # print "Parsed %s..." % (i.instance_type)
    return i


def parse_instance(tr, inst2family):
    i = Instance()
    cols = tr.xpath('td')
    assert len(cols) == 12, "Expected 12 columns in the table, but got %d" % len(cols)
    i.instance_type = totext(cols[0])
    i.family = inst2family.get(i.instance_type, "Unknown")
    # Some t2 instances support 32-bit arch
    # http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-resize.html#resize-limitations
    if i.instance_type in ('t2.micro', 't2.small'):
        i.arch.append('i386')
    i.vCPU = int(totext(cols[1]))
    i.memory = float(totext(cols[2]))
    storage = totext(cols[3])
    m = re.search(r'(\d+)\s*x\s*([0-9,]+)?', storage)
    i.ssd = False
    if m:
        i.ebs_only = False
        i.num_drives = int(m.group(1))
        i.drive_size = int(m.group(2).replace(',', ''))
        i.ssd = 'SSD' in totext(cols[3])
    else:
        assert storage == 'EBS Only', "Unrecognized storage spec: %s" % (storage,)
        i.ebs_only = True
    i.ebs_optimized = totext(cols[10]).lower() == 'yes'
    i.network_performance = totext(cols[4])
    i.enhanced_networking = totext(cols[11]).lower() == 'yes'
    i.generation = 'current'
    # print "Parsed %s..." % (i.instance_type)
    return i


def _rindex_family(inst2family, details):
    rows = details.xpath('tbody/tr')[0:]
    for r in rows:
        cols = r.xpath('td')
        for i in totext(cols[1]).split('|'):
            i = i.strip()
            inst2family[i] = totext(cols[0])


def scrape_families():
    inst2family = dict()
    tree = etree.parse(urllib2.urlopen("http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html"),
                       etree.HTMLParser())
    details = tree.xpath('//div[@class="informaltable"]//table')[0]
    hdrs = details.xpath('thead/tr')[0]
    if totext(hdrs[0]).lower() == 'instance family' and 'current generation' in totext(hdrs[1]).lower():
        _rindex_family(inst2family, details)

    details = tree.xpath('//div[@class="informaltable"]//table')[1]
    hdrs = details.xpath('thead/tr')[0]
    if totext(hdrs[0]).lower() == 'instance family' and 'previous generation' in totext(hdrs[1]).lower():
        _rindex_family(inst2family, details)

    assert len(inst2family) > 0, "Failed to find instance family info"
    return inst2family


def scrape_instances():
    inst2family = scrape_families()
    tree = etree.parse(urllib2.urlopen("http://aws.amazon.com/ec2/instance-types/"), etree.HTMLParser())
    details = tree.xpath('//table')[9]
    rows = details.xpath('tbody/tr')[1:]
    assert len(rows) > 0, "Didn't find any table rows."
    current_gen = [parse_instance(r, inst2family) for r in rows]

    tree = etree.parse(urllib2.urlopen("http://aws.amazon.com/ec2/previous-generation/"), etree.HTMLParser())
    details = tree.xpath('//table')[6]
    rows = details.xpath('tbody/tr')[1:]
    assert len(rows) > 0, "Didn't find any table rows."
    prev_gen = [parse_prev_generation_instance(r) for r in rows]

    return prev_gen + current_gen


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
                # As best I can tell, this type doesn't exist, but is
                # in the pricing charts anyways.
                if i_type == 'cc2.4xlarge':
                    continue
                assert i_type in imap, "Unknown instance size: %s" % i_type
                inst = imap[i_type]
                inst.pricing.setdefault(region, {})
                # print "%s/%s" % (region, i_type)

                inst.pricing[region].setdefault(platform, {})
                for col in i_spec['valueColumns']:
                    inst.pricing[region][platform]['ondemand'] = col['prices']['USD']

                # ECU is only available here
                try:
                    inst.ECU = float(i_spec['ECU'])
                except:
                    # these are likely instances with 'variable' ECU
                    inst.ECU = i_spec['ECU']


def add_reserved_pricing(imap, data, platform):
    for region_spec in data['config']['regions']:
        region = transform_region(region_spec['region'])
        for t_spec in region_spec['instanceTypes']:
            i_type = t_spec['type']
            # As best I can tell, this type doesn't exist, but is
            # in the pricing charts anyways.
            if i_type == 'cc2.4xlarge':
                continue
            assert i_type in imap, "Unknown instance size: %s" % i_type
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


def add_pricing_info(instances):
    pricing_modes = ['ri', 'od']

    reserved_name_map = {
        'linux': 'linux-unix-shared',
        'mswin': 'windows-shared',
        'mswinSQL': 'windows-with-sql-server-standard-shared',
        'mswinSQLWeb': 'windows-with-sql-server-web-shared'
    }

    for i in instances:
        i.pricing = {}

    by_type = {i.instance_type: i for i in instances}

    for platform in ['linux', 'mswin', 'mswinSQL', 'mswinSQLWeb']:
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
    table = tree.xpath('//div[@class="informaltable"]//table')[0]
    rows = table.xpath('.//tr[./td]')
    by_type = {i.instance_type: i for i in instances}

    for r in rows:
        instance_type = etree.tostring(r[0], method='text').strip()
        max_enis = int(etree.tostring(r[1], method='text').strip())
        ip_per_eni = int(etree.tostring(r[2], method='text').strip())
        if instance_type not in by_type:
            print "Unknown instance type: " + instance_type
            continue
        by_type[instance_type].vpc = {
            'max_enis': max_enis,
            'ips_per_eni': ip_per_eni}


def add_ebs_info(instances):
    ebs_url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSOptimized.html"
    tree = etree.parse(urllib2.urlopen(ebs_url), etree.HTMLParser())
    table = tree.xpath('//div[@class="informaltable"]//table')[0]
    rows = table.xpath('tbody/tr')
    by_type = {i.instance_type: i for i in instances}

    for row in rows:
        cols = row.xpath('td')
        instance_type = totext(cols[0]).split(' ')[0]
        ebs_optimized_by_default = totext(cols[1]) == 'Yes'
        ebs_throughput = int(totext(cols[2]).strip().replace(',', ''))
        ebs_iops = int(totext(cols[3]).strip().replace(',', ''))
        ebs_max_bandwidth = float(totext(cols[4]).strip().replace(',', ''))
        if instance_type not in by_type:
            print "Unknown instance type: " + instance_type
            continue
        by_type[instance_type].ebs_optimized_by_default = ebs_optimized_by_default
        by_type[instance_type].ebs_throughput = ebs_throughput
        by_type[instance_type].ebs_iops = ebs_iops
        by_type[instance_type].ebs_max_bandwidth = ebs_max_bandwidth


def add_linux_ami_info(instances):
    """Add information about which virtualization options are supported.

    Note that only HVM is supported for Windows instances so that info is not
    given its own column.

    """
    checkmark_char = u'\u2713'
    url = "http://aws.amazon.com/amazon-linux-ami/instance-type-matrix/"
    tree = etree.parse(urllib2.urlopen(url), etree.HTMLParser())
    table = tree.xpath('//div[@class="aws-table "]/table')[0]
    rows = table.xpath('.//tr[./td]')[1:]  # ignore header

    for r in rows:
        supported_types = []
        family_id = totext(r[0]).lower()
        if not family_id:
            continue
        # We only check the primary EBS-backed values here since the 'storage'
        # column will already be able to tell users whether or not the instance
        # they're looking at can use EBS and/or instance-store AMIs.
        if totext(r[1]) == checkmark_char:
            supported_types.append('HVM')
        if totext(r[3]) == checkmark_char:
            supported_types.append('PV')

        # Apply types for this instance family to all matching instances
        for i in instances:
            i_family_id = i.instance_type.split('.')[0]
            if i_family_id == family_id:
                i.linux_virtualization_types = supported_types


def scrape(data_file):
    """Scrape AWS to get instance data"""
    print "Parsing instance types..."
    all_instances = scrape_instances()
    print "Parsing pricing info..."
    add_pricing_info(all_instances)
    print "Parsing ENI info..."
    add_eni_info(all_instances)
    print "Parsing EBS info..."
    add_ebs_info(all_instances)
    print "Parsing Linux AMI info..."
    add_linux_ami_info(all_instances)
    with open(data_file, 'w') as f:
        json.dump([i.to_dict() for i in all_instances],
                  f,
                  indent=2,
                  separators=(',', ': '))


if __name__ == '__main__':
    scrape('www/instances.json')
