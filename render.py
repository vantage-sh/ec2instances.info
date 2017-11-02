import mako.template
import mako.lookup
import mako.exceptions
import json
import datetime


def network_sort(inst):
    perf = inst['network_performance']
    network_rank = [
        'Very Low',
        'Low',
        'Low to Moderate',
        'Moderate',
        'High',
        'Up to 10 Gigabit',
        '10 Gigabit',
        '20 Gigabit'
    ]
    try:
        sort = network_rank.index(perf)
    except ValueError:
        sort = len(network_rank)
    sort *= 2
    if inst.get('ebs_optimized'):
        sort += 1
    return sort


def add_cpu_detail(i):
    try:
        i['ECU_per_vcpu'] = i['ECU'] / i['vCPU']
    except:
        # these will be instances with variable/burstable ECU
        i['ECU_per_vcpu'] = 'unknown'
    if 'physical_processor' in i:
        i['physical_processor'] = (i['physical_processor'] or '').replace('*', '')
        i['intel_avx'] = 'Yes' if i['intel_avx'] else ''
        i['intel_avx2'] = 'Yes' if i['intel_avx2'] else ''
        i['intel_turbo'] = 'Yes' if i['intel_turbo'] else ''


def add_render_info(i):
    i['network_sort'] = network_sort(i)
    add_cpu_detail(i)


def render(data_file, template_file, destination_file):
    """Build the HTML content from scraped data"""
    lookup = mako.lookup.TemplateLookup(directories=['.'])
    template = mako.template.Template(filename=template_file, lookup=lookup)
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
