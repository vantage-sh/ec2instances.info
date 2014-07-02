import mako.template
import mako.exceptions
import json
import datetime


def pretty_name(inst):
    pieces = inst['instance_type'].split('.')
    family = pieces[0]
    short  = pieces[1]
    family_names = {
        'r3': 'R3 High-Memory',
        'c3': 'C3 High-CPU',
        'm3': 'M3 General Purpose',
        'i3': 'I3 High I/O',
        'cc1': 'Cluster Compute',
        'cg1': 'Cluster GPU',
        'cc2': 'Cluster Compute',
        'cr1': 'High Memory Cluster',
        'hs1': 'High Storage',
        'c1' : 'C1 High-CPU',
        'hi1': 'HI1. High I/O',
        'm2' : 'M2 High Memory',
        'm1' : 'M1 General Purpose'
        }
    prefix = family_names.get(family, family.upper())
    extra = None
    if short.startswith('8x'):
        extra = 'Eight'
    elif short.startswith('4x'):
        extra = 'Quadruple'
    elif short.startswith('2x'):
        extra = 'Double'
    elif short.startswith('x'):
        extra = ''
    bits = [prefix]
    if extra is not None:
        bits.extend([extra, 'Extra'])
        short = 'Large'

    bits.append(short.capitalize())

    return ' '.join([b for b in bits if b])

def network_sort(inst):
    perf = inst['network_performance']
    if perf == 'Very Low':
        sort = 0
    elif perf == 'Low':
        sort = 1
    elif perf == 'Moderate':
        sort = 2
    elif perf == 'High':
        sort = 3
    elif perf == '10 Gigabit':
        sort = 4
    else:  ## unknown value
        sort = 5
    sort *= 2
    if inst['ebs_optimized']:
        sort += 1
    return sort

def add_cpu_detail(i):
    if i['instance_type'] in ('cc1.4xlarge', 'cg1.4xlarge'):
        i['cpu_details'] = {
            'cpus': 2,
            'type': 'Xeon X5570',
            'note': 'Quad-core Nehalem architecture'
            }
    elif i['instance_type'] in ('hi1.4xlarge', 'hs1.8xlarge'):
        i['cpu_details'] = {
            'cpus': 2,
            'type': 'Xeon E5-2650',
            'note': 'Eight-core Sandy Bridge architecture'
            }
    elif i['instance_type'] in ('cc2.8xlarge', 'cr1.8xlarge'):
        i['cpu_details'] = {
            'cpus': 2,
            'type': 'Xeon E5-2670',
            'note': 'Eight-core Sandy Bridge architecture'
            }

def add_render_info(i):
    i['network_sort'] = network_sort(i)
    i['pretty_name'] = pretty_name(i)
    add_cpu_detail(i)

def render(data_file, template_file, destination_file):
    """Build the HTML content from scraped data"""
    template = mako.template.Template(filename=template_file)
    print "Loading data from %s..." % data_file
    with open(data_file) as f:
        instances = json.load(f)
    for i in instances:
        add_render_info(i)
    print "Rendering to %s..." % destination_file
    generated_at = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    with open(destination_file, 'w') as fh:
        try:
            fh.write(template.render(instances=instances, generated_at=generated_at))
        except:
            print mako.exceptions.text_error_template().render()

if __name__ == '__main__':
    render('www/instances.json', 'in/index.html.mako', 'www/index.html')
