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


def initial_prices(i):
    # For EC2, basically everything has a price for linux, on-demand in us-east-1
    # so default to that. Certain instances (mac2) are only available as dedicated hosts so
    # fall back to that if no linux option. Reserved options are all over the place
    # so try/catch for anything and set to n/a
    not_linux_flag = False

    init_p = {"ondemand": 0, "spot": 0, "_1yr": 0, "_3yr": 0}
    for pricing_type in ["ondemand", "spot", "_1yr", "_3yr"]:
        for os in ["linux", "dedicated"]:
            try:
                if "yr" in pricing_type:
                    init_p[pricing_type] = i["Pricing"]["us-east-1"][os][pricing_type][
                        "Standard.noUpfront"
                    ]
                else:
                    init_p[pricing_type] = i["Pricing"]["us-east-1"][os][pricing_type]
                break
            except:
                init_p[pricing_type] = "'N/A'"
            finally:
                # Let the frontend know that we're defaulting to a dedicated host
                # to display pricing instead of linux
                if os == "dedicated" and init_p[pricing_type] != "'N/A'":
                    not_linux_flag = True

    return [
        init_p["ondemand"],
        init_p["spot"],
        init_p["_1yr"],
        init_p["_3yr"],
        not_linux_flag,
    ]


def description(id, defaults):
    name = id["Amazon"][1]["value"]
    family_category = id["Amazon"][2]["value"].lower()
    cpus = id["Compute"][0]["value"]
    memory = id["Compute"][1]["value"]
    bandwidth = id["Networking"][0]["value"]

    # Some instances say "Low to moderate" for bandwidth, ignore them
    try:
        bandwidth = " and {} Gibps of bandwidth".format(
            int(id["Networking"][0]["value"])
        )
    except:
        bandwidth = ""

    return "The {} instance is in the {} family with {} vCPUs, {} GiB of memory{} starting at ${} per hour.".format(
        name, family_category, cpus, memory, bandwidth, defaults[0]
    )


ec2_os = {
    "linux": "Linux",
    "mswin": "Windows",
    "rhel": "Red Hat",
    "sles": "SUSE",
    "dedicated": "Dedicated Host",
    "linuxSQL": "Linux SQL Server",
    "linuxSQLWeb": "Linux SQL Server for Web",
    "linuxSQLEnterprise": "Linux SQL Enterprise",
    "mswinSQL": "Windows SQL Server",
    "mswinSQLWeb": "Windows SQL Web",
    "mswinSQLEnterprise": "Windows SQL Enterprise",
    "rhelSQL": "Red Hat SQL Server",
    "rhelSQLWeb": "Red Hat SQL Web",
    "rhelSQLEnterprise": "Red Hat SQL Enterprise",
}


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
        if itype not in instance_fam_map:
            instance_fam_map[itype] = [member]
        else:
            instance_fam_map[itype].append(member)

        # The second list, where we will get the family from knowing the instance
        families[name] = itype

    # Order the families by number of cpus so they display this way on the webpage
    for f, ilist in instance_fam_map.items():
        ilist.sort(key=lambda x: x["cpus"])
        # Move the metal instances to the end of the list
        for j in ilist:
            if j["name"].endswith("metal"):
                ilist.remove(j)
                ilist.append(j)
        instance_fam_map[f] = ilist

    # for debugging: print(json.dumps(instance_fam_map, indent=4))
    return instance_fam_map, families, variant_families


def prices(pricing):
    display_prices = {}
    for region, p in pricing.items():
        display_prices[region] = {}

        for os, _p in p.items():
            display_prices[region][os] = {}

            if os == "ebs" or os == "emr":
                continue

            # Doing a lot of work to deal with prices having up to 6 places
            # after the decimal, as well as prices not existing for all regions
            # and operating systems.
            try:
                display_prices[region][os]["ondemand"] = _p["ondemand"]
            except KeyError:
                display_prices[region][os]["ondemand"] = "'N/A'"

            try:
                display_prices[region][os]["spot"] = _p["spot_max"]
            except KeyError:
                display_prices[region][os]["spot"] = "'N/A'"

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
                display_prices[region][os]["_1yr"] = "'N/A'"

            try:
                reserved = {}
                for k, v in _p["reserved"].items():
                    if "Term3" in k:
                        key = k[7:]
                        reserved[key] = v
                display_prices[region][os]["_3yr"] = reserved
            except KeyError:
                display_prices[region][os]["_3yr"] = "'N/A'"

    return display_prices


def storage(sattrs, imap):
    if not sattrs:
        return []
    storage_details = []
    for s, v in sattrs.items():
        try:
            # This is one row on a detail page
            display = imap[s]
            display["value"] = v
            storage_details.append(format_attribute(display))
        except KeyError:
            # We chose not to represent this storage attribute
            continue
    return storage_details


def load_service_attributes():
    # This CSV file contains nicely formatted names, styling hints,
    # and order of display for instance attributes
    data_file = "meta/service_attributes_ec2.csv"

    display_map = {}
    with open(data_file, "r") as f:
        reader = csv.reader(f)

        for i, row in enumerate(reader):
            cloud_key = row[0]
            if i == 0:
                # Skip the header
                continue
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
        if v == "false" or v == "0" or v == "none":
            display["style"] = "value value-false"
        elif v == "current":
            display["style"] = "value value-current"
        elif v == "previous":
            display["style"] = "value value-previous"
        else:
            display["style"] = "value value-true"

    return display


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
    ]

    # Nested attributes in instances.json that we handle differently
    special_attributes = [
        "pricing",
        "storage",
        "vpc",
    ]

    # Group attributes into categories which are then displayed in sections on the page
    instance_details = {}
    for c in categories:
        instance_details[c] = []

    for j, k in i.items():
        # Some attributes like storage have nested values that we handle differently
        if j not in special_attributes:
            # This is one row on a detail page
            display = imap[j]
            display["value"] = k
            instance_details[display["category"]].append(format_attribute(display))

    for c in categories:
        instance_details[c].sort(key=lambda x: int(x["order"]))

    return instance_details


def build_detail_pages_ec2(instances, destination_file):
    subdir = os.path.join("www", "aws", "ec2")

    ifam, fam_lookup, variants = assemble_the_families(instances)
    imap = load_service_attributes()

    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(
        filename="in/instance-type.html.mako", lookup=lookup
    )

    # To add more data to a single instance page, do so inside this loop
    could_not_render = []
    sitemap = []
    for i in instances:
        instance_type = i["instance_type"]
        # Use this to debug individual instances
        # if instance_type != "t4g.nano":
        #     continue

        instance_page = os.path.join(subdir, instance_type + ".html")
        instance_details = map_ec2_attributes(i, imap)
        instance_details["Pricing"] = prices(i["pricing"])
        instance_details["Storage"].extend(storage(i["storage"], imap))
        fam = fam_lookup[instance_type]
        fam_members = ifam[fam]
        denylist = unavailable_instances(instance_type, instance_details)
        defaults = initial_prices(instance_details)
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
                        variants=variants[instance_type[0:2]],
                    )
                )
                sitemap.append(instance_page)
            except:
                render_err = mako.exceptions.text_error_template().render()
                err = {"e": "ERROR for " + instance_type, "t": render_err}

                could_not_render.append(err)

    [print(err["e"], "{}".format(err["t"])) for err in could_not_render]
    [print(page["e"]) for page in could_not_render]

    return sitemap
