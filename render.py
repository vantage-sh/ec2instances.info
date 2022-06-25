import mako.template
import mako.lookup
import mako.exceptions
import io
import json
import datetime
import os
import csv


def network_sort(inst):
    perf = inst["network_performance"]
    network_rank = [
        "Very Low",
        "Low",
        "Low to Moderate",
        "Moderate",
        "High",
        "Up to 5 Gigabit",
        "Up to 10 Gigabit",
        "10 Gigabit",
        "12 Gigabit",
        "20 Gigabit",
        "Up to 25 Gigabit",
        "25 Gigabit",
        "50 Gigabit",
        "75 Gigabit",
        "100 Gigabit",
    ]
    try:
        sort = network_rank.index(perf)
    except ValueError:
        sort = len(network_rank)
    sort *= 2
    if inst.get("ebs_optimized"):
        sort += 1
    return sort


def add_cpu_detail(i):
    try:
        i["ECU_per_vcpu"] = i["ECU"] / i["vCPU"]
    except:
        # these will be instances with variable/burstable ECU
        i["ECU_per_vcpu"] = "unknown"

    try:
        i["memory_per_vcpu"] = round(i["memory"] / i["vCPU"], 2)
    except:
        # just to be safe...
        i["memory_per_vcpu"] = "unknown"

    if "physical_processor" in i:
        i["physical_processor"] = (i["physical_processor"] or "").replace("*", "")
        i["intel_avx"] = "Yes" if i["intel_avx"] else ""
        i["intel_avx2"] = "Yes" if i["intel_avx2"] else ""
        i["intel_avx512"] = "Yes" if i["intel_avx512"] else ""
        i["intel_turbo"] = "Yes" if i["intel_turbo"] else ""


def add_render_info(i):
    i["network_sort"] = network_sort(i)
    add_cpu_detail(i)



def get_instance_attributes(data_file):
    # Transform a CSV of instance attributes into a dict of dicts for later lookup

    instance_lookup = {}
    with open(data_file, 'r') as f:
        reader = csv.reader(f)
        header = []

        for i, row in enumerate(reader):
            if i == 0:
                header = row
                continue
            single_inst = {}
            for key, val in zip(header, row):
                single_inst[key] = val
            instance_lookup[row[4]] = single_inst

    return instance_lookup


def build_instance_families(instances, destination_file, pricing_json, instance_azs_json, generated_at):
    # Find URL path (service) for these instances. It's / for ec2
    subdir = 'www'
    dest_subdir = destination_file.split('/')[1]
    if dest_subdir != 'index.html':
        subdir = os.path.join('www', dest_subdir)

    idetails = get_instance_attributes("www/instance-types.csv")

    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename='in/instance-type.html.mako', lookup=lookup)
    instance_families = {}
    for i in instances:
        if "instance_type" in i:
            instance_type = i["instance_type"]
            if instance_type not in instance_families:
                instance_families[instance_type] = {
                    "instance_type": instance_type,
                    "instance_data": {},
                }
                instance_page = os.path.join(subdir, instance_type + '.html')
                attrs = idetails.get(instance_type)

                with io.open(instance_page, "w+", encoding="utf-8") as fh:
                    try:
                        fh.write(
                        template.render(
                            instance_type=instance_type,
                            pricing_json=pricing_json,
                            generated_at=generated_at,
                            instance_azs_json=instance_azs_json,
                            instance_attrs=attrs,
                        )
                        )
                    except:
                        print(mako.exceptions.text_error_template().render())


prices_dict = {}
prices_index = 0


def _compress_pricing(d):
    global prices_index

    for k, v in d.items():
        if k in prices_dict:
            nk = prices_dict[k]
        else:
            prices_dict[k] = nk = prices_index
            prices_index += 1

        if isinstance(v, dict):
            nv = dict(_compress_pricing(v))
        else:
            nv = v

        yield nk, nv


def compress_pricing(instances):
    global prices_index

    prices = {i["instance_type"]: i["pricing"] for i in instances}

    prices_dict.clear()
    prices_index = 0

    return json.dumps({"index": prices_dict, "data": dict(_compress_pricing(prices))})


def compress_instance_azs(instances):
    instance_type_region_availability_zones = {}
    for inst in instances:
        if "instance_type" in inst and "availability_zones" in inst:
            instance_type_region_availability_zones[inst["instance_type"]] = inst[
                "availability_zones"
            ]
    return json.dumps(instance_type_region_availability_zones)


def render(data_file, template_file, destination_file):
    """Build the HTML content from scraped data"""
    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename=template_file, lookup=lookup)
    print("Loading data from %s..." % data_file)
    with open(data_file) as f:
        instances = json.load(f)
    for i in instances:
        add_render_info(i)


    pricing_json = compress_pricing(instances)
    instance_azs_json = compress_instance_azs(instances)
    print("Rendering to %s..." % destination_file)
    generated_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    build_instance_families(instances, destination_file, pricing_json, instance_azs_json, generated_at)

    os.makedirs(os.path.dirname(destination_file), exist_ok=True)
    with io.open(destination_file, "w+", encoding="utf-8") as fh:
        try:
            fh.write(
                template.render(
                    instances=instances,
                    pricing_json=pricing_json,
                    generated_at=generated_at,
                    instance_azs_json=instance_azs_json,
                )
            )
        except:
            print(mako.exceptions.text_error_template().render())


if __name__ == "__main__":
    render("www/instances.json", "in/index.html.mako", "www/index.html")
    render("www/rds/instances.json", "in/rds.html.mako", "www/rds/index.html")
    render("www/cache/instances.json", "in/cache.html.mako", "www/cache/index.html")
