from lxml import etree
import urllib2
import re
import json

class Instance(object):
    def __init__(self):
        self.vpc = None

    def to_dict(self):
        d = dict(family=self.family,
                 instance_type=self.instance_type,
                 arch=self.arch,
                 vCPU=self.vCPU,
                 ECU=self.ECU,
                 memory=self.memory,
                 ebs_optimized=self.ebs_optimized,
                 network_performance=self.network_performance,
                 pricing=self.pricing,
                 vpc=self.vpc)
        if self.ebs_only:
            d['storage'] = None
        else:
            d['storage'] = dict(ssd=self.ssd,
                                devices=self.num_drives,
                                size=self.drive_size)
        return d

def parse_instance(tr):
    i = Instance()
    cols = tr.xpath('td')
    assert len(cols) == 9, "Expected 9 columns in the table!"
    i.family = cols[0].text.strip()
    i.instance_type = cols[1].text.strip()
    archs = etree.tostring(cols[2], method='text').strip()
    i.arch = []
    if '32-bit' in archs:
        i.arch.append('i386')
    if '64-bit' in archs:
        i.arch.append('x86_64')
    assert i.arch, "No archs detected: %s" % (archs,)
    i.vCPU = int(cols[3].text.strip())
    ecu = cols[4].text.strip()
    if ecu == 'Variable':
        i.ECU = None
    else:
        i.ECU  = float(cols[4].text.strip())
    i.memory = float(cols[5].text.strip())
    storage = cols[6].text.strip()
    m = re.search(r'(\d+)\s*x\s*([0-9,]+)?', storage)
    i.ssd = False
    if m:
        i.ebs_only = False
        i.num_drives = int(m.group(1))
        i.drive_size = int(m.group(2).replace(',', ''))
        i.ssd = 'SSD' in etree.tostring(cols[6], method='text')
    else:
        assert storage == 'EBS only', "Unrecognized storage spec: %s" % (storage,)
        i.ebs_only = True
    i.ebs_optimized = tr[7].text.strip().lower() == 'yes'
    i.network_performance = tr[8].text.strip()
    print "Parsed %s..." % (i.instance_type)
    return i

def scrape_instances():
    tree = etree.parse(urllib2.urlopen("http://aws.amazon.com/ec2/instance-types/"), etree.HTMLParser())
    details = tree.xpath('//table')[0]
    rows = details.xpath('tr')
    return [parse_instance(r) for r in rows]

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

def convert_to_type(typ, size):
    return size

def transform_region(reg):
    region_map = {
        'eu-ireland': 'eu-west-1',
        'apac-sin': 'ap-southeast-1',
        'apac-syd': 'ap-southeast-2',
        'apac-tokyo': 'ap-northeast-1',
        }
    if reg in region_map:
        return region_map[reg]
    m = re.search(r'^([^0-9]*)(-(\d))?$', reg)
    assert m, "Can't parse region: %s" % (reg,)
    base = m.group(1)
    num = m.group(3) or '1'
    return base + "-" + num

def add_pricing(imap, data):
    for region_spec in data['config']['regions']:
        region = transform_region(region_spec['region'])
        for t_spec in region_spec['instanceTypes']:
            typename = t_spec['type']
            for i_spec in t_spec['sizes']:
                i_type = convert_to_type(typename, i_spec['size'])
                # As best I can tell, this type doesn't exist, but is
                # in the pricing charts anyways.
                if i_type == 'cc2.4xlarge': continue
                assert i_type in imap, "Unknown instance size: %s" % (i_type, )
                inst = imap[i_type]
                inst.pricing.setdefault(region, {})
                print "%s/%s" % (region, i_type)
                for col in i_spec['valueColumns']:
                    inst.pricing[region][col['name']] = col['prices']['USD']

def add_pricing_data(instances):
    for i in instances:
        i.pricing = {}
    by_type = {i.instance_type:i for i in instances}

    for platform in ['linux', 'mswin']:
        pricing_url = 'http://aws.amazon.com/ec2/pricing/json/%s-od.json' % (platform,)
        pricing = json.loads(urllib2.urlopen(pricing_url).read())

        add_pricing(by_type, pricing)

def add_eni_info(instances):
    eni_url = "http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html"
    tree = etree.parse(urllib2.urlopen(eni_url), etree.HTMLParser())
    table = tree.xpath('//div[@id="divContent"]/div[@class="section"]//table[.//code[contains(., "cc2.8xlarge")]]')[0]
    rows = table.xpath('.//tr[./td]')
    by_type = {i.instance_type:i for i in instances}

    for r in rows:
        instance_type = etree.tostring(r[0], method='text').strip()
        max_enis = int(etree.tostring(r[1], method='text').strip())
        ip_per_eni = int(etree.tostring(r[2], method='text').strip())
        if instance_type not in by_type:
            print "Unknown instance type: " + instance_type
            continue
        by_type[instance_type].vpc = {
            'max_enis': max_enis,
            'ips_per_eni': ip_per_eni
            }

if __name__ == '__main__':
    print "Parsing instance types..."
    all_instances = scrape_instances()
    print "Parsing pricing info..."
    add_pricing_data(all_instances)
    add_eni_info(all_instances)
    with open('www/instances.json', 'w') as f:
        json.dump([i.to_dict() for i in all_instances],
                  f,
                  indent=2,
                  separators=(',', ': '))
