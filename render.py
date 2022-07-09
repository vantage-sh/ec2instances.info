import mako.template
import mako.lookup
import mako.exceptions
import io
import json
import datetime
import os
import csv
import bisect
import yaml


def description(instance):
    name = instance["pretty_name"]
    family_category = instance["family"]
    cpus = instance["vCPU"]
    memory = instance["memory"]
    bandwidth = instance["network_performance"]

    return "The {} is a {} instance with {} CPUs, {} GiB of memory and {} of bandwidth".format(
        name, family_category, cpus, memory, bandwidth)

def community():
    data_file = "community_contributions.yaml"

    stream = open(data_file, "r")
    dictionary = yaml.load_all(stream, Loader=yaml.SafeLoader)
    print(list(dictionary))


def unavailable_instances():
    pass

def assemble_the_families(instances):
    # Build 2 lists - one where we can lookup what family an instance belongs to
    # and another where we can get the family and see what the members are
    instance_fam_map = {}
    families = {}

    for i in instances:
        name = i["instance_type"]
        itype = name.split(".")[0]

        member = {"name": name, "cpus": int(i["vCPU"]), "memory": int(i["memory"])}
        if itype not in instance_fam_map:
            instance_fam_map[itype] = [member]
        else:
            instance_fam_map[itype].append(member)        

        # The second list, where we will get the family from knowing the instance
        families[name] = itype

    # Order the families by number of cpus so they display this way on the webpage
    for f, i in instance_fam_map.items():
        i.sort(key=lambda x: x["cpus"])
        instance_fam_map[f] = i
    

    # for debugging: print(json.dumps(instance_fam_map, indent=4))
    return instance_fam_map, families


def storage(attrs):
    pass


def availability(attrs):
    pass


def vpc(attrs):
    pass


def prices(pricing):
    display_prices = {}
    for region, p in pricing.items():
        display_prices[region] = {}

        for os, _p in p.items():
            display_prices[region][os] = {}
            
            if os == 'ebs' or os == 'emr':
                continue

            # Doing a lot of work to deal with prices having up to 6 places
            # after the decimal, as well as prices not existing for all regions
            # and operating systems. 
            try:
                display_prices[region][os]["ondemand"] = format(
                    float(_p["ondemand"]), ".3f")
            except KeyError:
                display_prices[region][os]["ondemand"] = "N/A"
            try:
                display_prices[region][os]["spot"] = format(
                    float(_p["spot_max"]), ".3f")
            except KeyError:
                display_prices[region][os]["spot"] = "N/A"
            try:
                display_prices[region][os]["_1yr"] = format(
                    float(_p["reserved"]["yrTerm1Standard.noUpfront"]), ".3f")
            except KeyError:
                display_prices[region][os]["_1yr"] = "N/A"
            try:
                display_prices[region][os]["_3yr"] = format(
                    float(_p["reserved"]["yrTerm3Standard.noUpfront"]), ".3f")
            except KeyError:
                display_prices[region][os]["_3yr"] = "N/A"
    
    return display_prices


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
    data_file = 'service_attributes_ec2.csv'

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
        "Compute",
        "Networking",
        "Storage",
        "Amazon",
        "Not Shown",
        "Coming Soon",
    ]
    instance_details = {}
    for c in categories:
        instance_details[c] = []

    print(i['instance_type'])

    # Data structure is:
    # { "Compute": [
    #     { "display_name": "CPUs",
    #       "cagegory": "Compute",
    #       "value": 8,
    #       "cloud_key": "vCPU",
    #     }
    #  ]
    # }
    # For up to date display names, inspect service_attributes_ec2.csv
    imap = load_service_attributes()
    for j, k in i.items():

        display = imap[j]
        display["value"] = k if j != 'pricing' else {}
        display["cloud_key"] = j
        instance_details[display["category"]].append(display)
    
    # Sort the instance attributes in each category alphabetically,
    # another general-purpose option could be to sort by value data type
    for c in categories:
        instance_details[c].sort(key=lambda x: x["display_name"])

    instance_details['Pricing'] = prices(i["pricing"])
    # print(json.dumps(instance_details, indent=4))
    return instance_details


def build_instance_families(instances, destination_file):
    # Extract which service these instances belong to, for example EC2 is loaded at /
    service_path = destination_file.split('/')[1]
    
    # Find the right path to write these files to. There is a .gitignore file
    # in each directory so that these generated files are not committed
    subdir = os.path.join('www', 'aws', 'ec2')
    if service_path != 'index.html':
        subdir = os.path.join('www', 'aws', service_path)

    ifam, fam_lookup = assemble_the_families(instances)

    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename='in/instance-type.html.mako', lookup=lookup)

    # To add more data to a single instance page, do so inside this loop
    for i in instances:
        instance_type = i["instance_type"]

        instance_page = os.path.join(subdir, instance_type + '.html')
        instance_details = map_ec2_attributes(i)
        fam = fam_lookup[instance_type]
        fam_members = ifam[fam]
        idescription = description(i)

        with io.open(instance_page, "w+", encoding="utf-8") as fh:
            try:
                fh.write(template.render(
                    i=instance_details,
                    family=fam_members,
                    description=idescription,
                ))
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


def add_render_info(i):
    i["network_sort"] = network_sort(i)
    add_cpu_detail(i)


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
