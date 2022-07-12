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
import re


def initial_prices(i, instance_type):
    flag = ""
    try:
        od = i["Pricing"]["us-east-1"]["linux"]["ondemand"]
    except:
        # If prices are not available for us-east-1 it means this is a custom instance of some kind
        return ["'N/A'", "'N/A'", "'N/A'", "'N/A'"]

    od = i["Pricing"]["us-east-1"]["linux"]["ondemand"]
    spot = i["Pricing"]["us-east-1"]["linux"]["spot"]
    try:
        _1yr = i["Pricing"]["us-east-1"]["linux"]["_1yr"]["Standard.noUpfront"]
        _3yr = i["Pricing"]["us-east-1"]["linux"]["_3yr"]["Standard.noUpfront"]
    except:
        # If we can't get a reservation, likely a previous generation
        _1yr = "'N/A'"
        _3yr = "'N/A'"

    return [od, spot, _1yr, _3yr]


def description(id):
    name = id["Amazon"][1]["value"]
    family_category = id["Amazon"][2]["value"].lower()
    cpus = id["Compute"][0]["value"]
    memory = id["Compute"][1]["value"]
    bandwidth = id["Networking"][0]["value"]

    # Some instances say "Low to moderate" for bandwidth, ignore them
    try:
        bandwidth = " and {} Gibps of bandwidth.".format(int(id["Networking"][0]["value"]))
    except:
        bandwidth = "."

    return "The {} instance is a {} instance with {} CPUs, {} GiB of memory{}".format(
        name, family_category, cpus, memory, bandwidth)


def community(instance, links):
    # TODO: not the most efficient with many links
    for l in links:
        k, linklist = next(iter(l.items()))
        if k == instance:
            return linklist["links"]


def unavailable_instances(itype, instance_details):
    data_file = "meta/regions_aws.yaml"
    ec2_os = {
        "linux": "Linux", 
        "mswin": "Windows",
        "rhel": "Red Hat",
        "sles": "SUSE",
    }

    denylist = []
    with open(data_file, "r") as f:
        aws_regions = yaml.safe_load(f)
        instance_regions = instance_details["Pricing"].keys()

        # If there is no price for a region and os, then it is unavailable
        for r in aws_regions:
            if r not in instance_regions:
                # print("Found that {} is not available in {}".format(itype, r))
                denylist.append([aws_regions[r], r, "All", "*"])
            else:
                instance_regions_oss = instance_details["Pricing"][r].keys()
                for os in ec2_os.keys():
                    if os not in instance_regions_oss:
                        denylist.append([aws_regions[r], r, ec2_os[os], os])
                        # print("Found that {} is not available in {} as {}".format(itype, r, os))
    return denylist


def assemble_the_families(instances):
    # Build 2 lists - one where we can lookup what family an instance belongs to
    # and another where we can get the family and see what the members are
    instance_fam_map = {}
    families = {}
    variant_families = {}

    for i in instances:
        name = i["instance_type"]
        itype, suffix = name.split(".")
        variant = itype[0:2]

        if variant not in variant_families:
            variant_families[variant] = [[itype, name]]
        else:
            dupe = 0
            for v, _ in variant_families[variant]:
                if v == itype:
                    dupe = 1
            if not dupe:
                variant_families[variant].append([itype, name])

        member = {"name": name, "cpus": int(i["vCPU"]), "memory": int(i["memory"])}
        if suffix != "metal":
            # metal instances are variants not family members (by this taxonomy)
            if itype not in instance_fam_map:
                instance_fam_map[itype] = [member]
            else:
                instance_fam_map[itype].append(member)        
        else:
            if itype not in instance_fam_map:
                instance_fam_map[itype] = [member]
            else:
                variant_families[variant].append([name, name])

        # The second list, where we will get the family from knowing the instance
        families[name] = itype

    # Order the families by number of cpus so they display this way on the webpage
    for f, ilist in instance_fam_map.items():
        ilist.sort(key=lambda x: x["cpus"])
        instance_fam_map[f] = ilist

    # for debugging: print(json.dumps(instance_fam_map, indent=4))
    return instance_fam_map, families, variant_families


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
                display_prices[region][os]["ondemand"] = _p["ondemand"]
            except KeyError:
                display_prices[region][os]["ondemand"] = "N/A"

            try:
                display_prices[region][os]["spot"] = _p["spot_max"]
            except KeyError:
                display_prices[region][os]["spot"] = "N/A"

            try:
                reserved = {}
                for k, v in _p["reserved"].items():
                    if "Term1" in k:
                        key = k[7:]
                        reserved[key] = v
                display_prices[region][os]["_1yr"] = reserved
            except KeyError:
                display_prices[region][os]["_1yr"] = "N/A"

            try:
                reserved = {}
                for k, v in _p["reserved"].items():
                    if "Term3" in k:
                        key = k[7:]
                        reserved[key] = v
                display_prices[region][os]["_3yr"] = reserved
            except KeyError:
                display_prices[region][os]["_3yr"] = "N/A"
    
    return display_prices


def load_service_attributes():
    special_attrs = [
        "vpc",
        "storage",
        "pricing",
    ]
    data_file = 'meta/service_attributes_ec2.csv'

    display_map = {}
    with open(data_file, 'r') as f:
        reader = csv.reader(f)

        for i, row in enumerate(reader):
            cloud_key = row[0]
            if i == 0:
                # Skip the header
                continue
            elif cloud_key in special_attrs:
                category = "Coming Soon"
            else:
                category = row[2]

            display_map[cloud_key] = {
                "cloud_key": cloud_key,
                "display_name": row[1],
                "category": category,
                "order": row[3],
                "style": row[4],
                "regex": row[5],
                "value": None,
                "variant_family": row[1][0:2],
            }
            
    return display_map


def load_service_attributes_cloudhw(data_file="meta/instance_types_cloudhw.csv"):
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


def map_ec2_attributes(i, imap):
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

    # For up to date display names, inspect meta/service_attributes_ec2.csv
    for j, k in i.items():

        display = imap[j]
        display["value"] = k if j != 'pricing' else {}

        if display["regex"]:
            toparse = str(display["value"])
            regex = str(display["regex"])
            match = re.search(regex, toparse)
            if match:
                display["value"] = match.group()
            # else:
            #     print("No match found for {} with regex {}".format(toparse, regex))
        
        if display["style"]:
            v = str(display["value"]).lower()
            # print(v)  # print styling value
            if v == "false" or v == "0" or v == "none":
                display["style"] = "value value-false"
            elif v == "current":
                display["style"] = "value value-current"
            elif v == "previous":
                display["style"] = "value value-previous"
            else:
                display["style"] = "value value-true"

        instance_details[display["category"]].append(display)
    
    # Sort the instance attributes in each category alphabetically,
    # another general-purpose option could be to sort by value data type
    for c in categories:
        instance_details[c].sort(key=lambda x: int(x["order"]))

    instance_details['Pricing'] = prices(i["pricing"])
    # print(json.dumps(instance_details, indent=4))
    return instance_details


def build_detail_pages_ec2(instances, destination_file):
    # Extract which service these instances belong to, for example EC2 is loaded at /
    service_path = destination_file.split('/')[1]
    data_file = "community_contributions.yaml"
    stream = open(data_file, "r")
    community_data = list(yaml.load_all(stream, Loader=yaml.SafeLoader))

    # Find the right path to write these files to. There is a .gitignore file
    # in each directory so that these generated files are not committed
    subdir = os.path.join('www', 'aws', 'ec2')
    if service_path != 'index.html':
        subdir = os.path.join('www', 'aws', service_path)

    ifam, fam_lookup, variants = assemble_the_families(instances)
    imap = load_service_attributes()

    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename='in/instance-type.html.mako', lookup=lookup)

    # To add more data to a single instance page, do so inside this loop
    could_not_render = []
    for i in instances:
        instance_type = i["instance_type"]

        instance_page = os.path.join(subdir, instance_type + '.html')
        instance_details = map_ec2_attributes(i, imap)
        fam = fam_lookup[instance_type]
        fam_members = ifam[fam]
        idescription = description(instance_details)
        links = community(instance_type, community_data)
        denylist = unavailable_instances(instance_type, instance_details)
        defaults = initial_prices(instance_details, instance_type)

        print("Rendering %s to detail page %s..." % (instance_type, instance_page))
        with io.open(instance_page, "w+", encoding="utf-8") as fh:
            try:
                fh.write(template.render(
                    i=instance_details,
                    family=fam_members,
                    description=idescription,
                    links=links,
                    unavailable=denylist,
                    defaults=defaults,
                    variants=variants[instance_type[0:2]],
                ))
            except:
                render_err = mako.exceptions.text_error_template().render() 
                err = {
                    "e": "ERROR for " + instance_type, 
                    "t": render_err
                }

                could_not_render.append(err)
        # break
        
    [print(err["e"], '{}'.format(err["t"])) for err in could_not_render]
    [print(page["e"]) for page in could_not_render]
