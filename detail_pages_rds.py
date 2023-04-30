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


rds_engine_mapping = {
    "2": "MySQL",
    "3": "Oracle Standard One BYOL",
    "4": "Oracle Standard BYOL",
    "5": "Oracle",
    "6": "Oracle Standard One",
    "9": "SQL Server",
    "10": "SQL Server Express",
    "11": "SQL Server Standard",
    "12": "SQL Server Standard",
    "14": "PostgreSQL",
    "15": "SQL Server Enterprise",
    "16": "Aurora MySQL",
    "18": "MariaDB",
    "19": "Oracle Standard Two BYOL",
    "20": "Oracle Standard Two",
    "21": "Aurora PostgreSQL",
    "210": "MySQL (Outpost On-Prem)",
    "220": "PostgreSQL (Outpost On-Prem)",
    "230": "SQL Server Enterprise (Outpost On-Prem)",
    "231": "SQL Server (Outpost On-Prem)",
    "232": "SQL Server Web (Outpost On-Prem)",
}


def initial_prices(i, instance_type):
    try:
        if "mem" in instance_type:
            od = i["Pricing"]["us-east-1"]["Oracle"]["ondemand"]
        elif "z1d" in instance_type:
            od = i["Pricing"]["us-east-1"]["SQL Server Standard"]["ondemand"]
        else:
            od = i["Pricing"]["us-east-1"]["PostgreSQL"]["ondemand"]
    except:
        # If prices are not available for us-east-1 it means this is a custom instance of some kind
        return ["'N/A'", "'N/A'", "'N/A'"]

    try:
        if "mem" in instance_type:
            _1yr = i["Pricing"]["us-east-1"]["Oracle"]["_1yr"][
                "Standard.partialUpfront"
            ]
            _3yr = i["Pricing"]["us-east-1"]["Oracle"]["_3yr"][
                "Standard.partialUpfront"
            ]
        elif "z1d" in instance_type:
            _1yr = i["Pricing"]["us-east-1"]["SQL Server Standard"]["_1yr"][
                "Standard.partialUpfront"
            ]
            _3yr = i["Pricing"]["us-east-1"]["SQL Server Standard"]["_3yr"][
                "Standard.partialUpfront"
            ]
        else:
            _1yr = i["Pricing"]["us-east-1"]["PostgreSQL"]["_1yr"][
                "Standard.partialUpfront"
            ]
            _3yr = i["Pricing"]["us-east-1"]["PostgreSQL"]["_3yr"][
                "Standard.partialUpfront"
            ]
    except:
        # If we can't get a reservation, likely a previous generation
        _1yr = "'N/A'"
        _3yr = "'N/A'"

    return [od, _1yr, _3yr]


def description(id, defaults):
    name = id["Amazon"][1]["value"]
    family_category = id["Amazon"][2]["value"].lower()
    cpus = id["Compute"][0]["value"]
    memory = id["Compute"][1]["value"]
    bandwidth = id["Networking"][0]["value"]

    if (
        "low" in bandwidth.lower()
        or "moderate" in bandwidth.lower()
        or "high" in bandwidth.lower()
    ):
        bandwidth = " and {} network performance".format(bandwidth.lower())
    else:
        bandwidth.strip("Gigabit")
        bandwidth = " and {} Gibps of bandwidth".format(bandwidth.lower())

    return "The {} instance is in the {} family and has {} vCPUs, {} GiB of memory{} starting at ${} per hour.".format(
        name, family_category, cpus, memory, bandwidth, defaults[0]
    )


def unavailable_instances(itype, instance_details):
    data_file = "meta/regions_aws.yaml"

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
                for os in rds_engine_mapping.values():
                    if os not in instance_regions_oss:
                        denylist.append([aws_regions[r], r, os, os])
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
        itype = name.split(".")[1]
        suffix = "".join(name.split(".")[2:])
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

        member = {"name": name, "cpus": int(i["vcpu"]), "memory": float(i["memory"])}
        if itype not in instance_fam_map:
            instance_fam_map[itype] = [member]
        else:
            instance_fam_map[itype].append(member)

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
    # print(json.dumps(pricing, indent=4))

    for region, p in pricing.items():
        display_prices[region] = {}

        for os, _p in p.items():
            if len(os) > 3:
                # RDS ONLY: engines are numbers but some are words. We can skip the words
                continue

            os = rds_engine_mapping[os]
            display_prices[region][os] = {}

            # Doing a lot of work to deal with prices having up to 6 places
            # after the decimal, as well as prices not existing for all regions
            # and operating systems.
            try:
                display_prices[region][os]["ondemand"] = _p["ondemand"]
            except KeyError:
                display_prices[region][os]["ondemand"] = "N/A"

            # In the next 2 blocks, we need to split out the list of 1 year,
            # 3 year, upfront, partial, and no upfront RI prices into 2 sets
            # of prices: _1yr (all, partial, no) and _3yr (all, partial, no)
            # These are then rendered into the 2 bottom pricing dropdowns
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
    data_file = "meta/service_attributes_rds.csv"

    display_map = {}
    with open(data_file, "r") as f:
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


def format_attribute(display):
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
        if display["cloud_key"] == "currentGeneration" and v == "yes":
            display["style"] = "value value-current"
            display["value"] = "current"
        elif v == "false" or v == "0" or v == "none":
            display["style"] = "value value-false"
        elif v == "true" or v == "1" or v == "yes":
            display["style"] = "value value-true"
        elif display["cloud_key"] == "currentGeneration" and v == "no":
            display["style"] = "value value-previous"
            display["value"] = "previous"

    return display


def map_rds_attributes(i, imap):
    # For now, manually transform the instance data we receive from AWS
    # into the format we want to render. Later we can create this in YAML
    # and use a standard function that maps names
    categories = [
        "Compute",
        "Storage",
        "Networking",
        "Amazon",
        "Not Shown",
        "Coming Soon",
    ]

    # Nested attributes in instances.json that we handle differently
    special_attributes = [
        "pricing",
    ]

    instance_details = {}
    for c in categories:
        instance_details[c] = []

    # For up to date display names, inspect meta/service_attributes_ec2.csv
    for j, k in i.items():
        if j not in special_attributes:
            # This is one row on a detail page
            display = imap[j]
            display["value"] = k
            instance_details[display["category"]].append(format_attribute(display))

    # Sort the instance attributes in each category alphabetically,
    # another general-purpose option could be to sort by value data type
    for c in categories:
        instance_details[c].sort(key=lambda x: int(x["order"]))

    return instance_details


def build_detail_pages_rds(instances, destination_file):
    subdir = os.path.join("www", "aws", "rds")

    ifam, fam_lookup, variants = assemble_the_families(instances)
    imap = load_service_attributes()

    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(
        filename="in/instance-type-rds.html.mako", lookup=lookup
    )

    # To add more data to a single instance page, do so inside this loop
    could_not_render = []
    sitemap = []
    for i in instances:
        instance_type = i["instance_type"]

        instance_page = os.path.join(subdir, instance_type + ".html")
        instance_details = map_rds_attributes(i, imap)
        instance_details["Pricing"] = prices(i["pricing"])
        fam = fam_lookup[instance_type]
        fam_members = ifam[fam]
        denylist = unavailable_instances(instance_type, instance_details)
        defaults = initial_prices(instance_details, instance_type)
        idescription = description(instance_details, defaults)

        print("Rendering %s to detail page %s..." % (instance_type, instance_page))
        with io.open(instance_page, "w+", encoding="utf-8") as fh:
            try:
                fh.write(
                    template.render(
                        i=instance_details,
                        family=fam_members,
                        description=idescription,
                        unavailable=denylist,
                        defaults=defaults,
                        variants=variants[instance_type[3:5]],
                    )
                )
                sitemap.append(instance_page)
            except:
                render_err = mako.exceptions.text_error_template().render()
                err = {"e": "ERROR for " + instance_type, "t": render_err}

                could_not_render.append(err)
        # break

    [print(err["e"], "{}".format(err["t"])) for err in could_not_render]
    [print(page["e"]) for page in could_not_render]

    return sitemap
