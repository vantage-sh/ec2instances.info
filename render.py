import mako.template
import mako.exceptions
import json


def pretty_name(inst):
    pieces = inst['instance_type'].split('.')
    family = pieces[0]
    short  = pieces[1]
    family_names = {
        't1': '',
        'm2': 'High-Memory',
        'c1': 'High-CPU',
        'cc1': 'Cluster Compute',
        'cg1': 'Cluster GPU',
        'cc2': 'Cluster Compute',
        'hi1': 'High I/O',
        'cr1': 'High Memory Cluster',
        'hs1': 'High Storage'
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
    sort *= 2
    if inst['ebs_optimized']:
        sort += 1
    return sort

def add_render_info(i):
    i['network_sort'] = network_sort(i)
    i['pretty_name'] = pretty_name(i)

def render(src, dst):
    template = mako.template.Template(filename=src)
    with open('www/instances.json') as f:
        instances = json.load(f)
    for i in instances:
        add_render_info(i)
    with open(dst, 'w') as fh:
        try:
            fh.write(template.render(instances=instances))
        except:
            print mako.exceptions.text_error_template().render()

if __name__ == '__main__':
    render('in/index.html.mako', 'www/index.html')
