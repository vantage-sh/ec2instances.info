import mako.template
import mako.lookup
import mako.exceptions
import io
import json
import datetime
import os
import csv




def add_render_info(i):
    i["network_sort"] = network_sort(i)
    add_cpu_detail(i)


def storage(attrs):
    pass


def availability(attrs):
    pass


def vpc(attrs):
    pass


def prices(attrs):
    # price = json.dumps(i[j]['us-east-1'], indent=4)
    # print(price)
    pass


def route_special_cases(expanded_instance_attr):
    subcategory = expanded_instance_attr[0]

    if subcategory == "availability_zones":
        availability(expanded_instance_attr[3])
    elif subcategory == "vpc":
        vpc(expanded_instance_attr[3])
    elif subcategory == "storage":
        storage(expanded_instance_attr[3])


def load_service_attributes():
    special_attrs = [
        "availability_zones",
        "vpc",
        "storage",
        "pricing",
    ]
    data_file = 'service-attributes-ec2.csv'

    display_map = {}
    with open(data_file, 'r') as f:
        reader = csv.reader(f)

        for i, row in enumerate(reader):
            if i == 0:
                continue
            elif row[0] in special_attrs:
                route_special_cases(row)
                display_map[row[0]] = {
                    "display_name": row[1],
                    "category": "Coming Soon"
                }
            else:
                display_map[row[0]] = {
                    "display_name": row[1],
                    "category": row[2],
                }
            
    return display_map


def load_service_attributes_cloudhw(data_file):
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


def map_ec2_attributes(i):
    # For now, manually transform the instance data we receive from AWS 
    # into the format we want to render. Later we can create this in YAML
    # and use a standard function that maps names
    categories = [
        "Amazon",
        "Compute",
        "Networking",
        "Storage",
        "Hardware",
        "Not Shown",
        "Coming Soon",
    ]
    instance_details = {}
    for c in categories:
        instance_details[c] = []

    imap = load_service_attributes()
    for j, k in i.items():

        display = imap[j]
        display["value"] = k
        display["cloud_key"] = j
        instance_details[display["category"]].append(display)
    
    # Sort the instance attributes in each category alphabetically,
    # another general-purpose option could be to sort by value data type
    for c in categories:
        instance_details[c].sort(key=lambda x: x["display_name"])

    return instance_details


def build_instance_families(instances, destination_file):
    # Find URL path (service) for these instances. It's / for ec2
    subdir = 'www'
    dest_subdir = destination_file.split('/')[1]
    if dest_subdir != 'index.html':
        subdir = os.path.join('www', dest_subdir)

    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename='in/instance-type.html.mako', lookup=lookup)
    instance_families = {}
    for i in instances:
        # In case of emergency: print(json.dumps(i, indent=4))

        if "instance_type" in i:
            instance_type = i["instance_type"]
            if instance_type not in instance_families:
                instance_families[instance_type] = {
                    "instance_type": instance_type,
                    "instance_data": {},
                }
                instance_page = os.path.join(subdir, instance_type + '.html')
                instance_details = map_ec2_attributes(i)

                with io.open(instance_page, "w+", encoding="utf-8") as fh:
                    try:
                        fh.write(template.render(i=instance_details))
                    except:
                        print(mako.exceptions.text_error_template().render())


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
    with open(data_file) as f:
        instances = json.load(f)

    print("Loading data from %s..." % data_file)
    for i in instances:
        add_render_info(i)
    pricing_json = compress_pricing(instances)
    generated_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    instance_azs_json = compress_instance_azs(instances)
    build_instance_families(instances, destination_file)

    print("Rendering to %s..." % destination_file)
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
    # render("www/rds/instances.json", "in/rds.html.mako", "www/rds/index.html")
    # render("www/cache/instances.json", "in/cache.html.mako", "www/cache/index.html")
