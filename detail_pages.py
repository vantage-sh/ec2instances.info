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


class DetailPage(object):
    def init(self):
        pass
         
    def load_service_attributes(self, data_file):
        special_attrs = [
            "vpc",
            "storage",
            "pricing",
        ]

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

    def unavailable_instances(self, itype, instance_details):
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


    def format_attribute(self, display):

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

    
    # For EC2: deal with metal instances
    def assemble_the_families(self, instances):
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


    # For EC2: include spot
    def prices(self, pricing):
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


detail_page_renderer = DetailPage()

data_file = "meta/service_attributes_rds.csv"
detail_page_renderer(data_file)
