import mako.template
import mako.lookup
import mako.exceptions
import io
import json
import datetime
import os
import copy
import yaml

from detail_pages_azure import build_detail_pages_azure


def add_cpu_detail(i):
    try:
        i["ACU_per_vcpu"] = i["ACU"] / i["vcpu"]
    except:
        # these will be instances with variable/burstable ECU
        i["ACU_per_vcpu"] = "unknown"

    try:
        if "vcpu" in i:
            i["memory_per_vcpu"] = round(float(i["memory"]) / float(i["vcpu"]), 2)
    except:
        # just to be safe...
        i["memory_per_vcpu"] = "unknown"


def add_render_info(i):
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


def remove_prefix(instances):
    for i in instances:
        i['instance_type'] = i['instance_type'].replace('Standard_', '').replace('_', '-')


def per_region_pricing(instances, data_file):
    # This function splits instances.json into per-region files which are written to
    # disk and then can be loaded by the web app to reduce the amount of data that
    # needs to be sent to the client.

    region_list = "meta/regions_azure.yaml"
    with open(region_list, "r") as f:
        aws_regions = yaml.safe_load(f)

    init_pricing_json = ""
    init_instance_azs_json = ""

    outdir = data_file.replace("instances.json", "")

    instances_no_pricing = copy.deepcopy(instances)
    for i in instances_no_pricing:
        if "pricing" in i:
            del i["pricing"]
        if "availability_zones" in i:
            del i["availability_zones"]

    for r in aws_regions:
        per_region_out = {}
        per_region_out = instances_no_pricing

        for i, inst in enumerate(instances):
            per_region_out[i]["pricing"] = {}
            per_region_out[i]["availability_zones"] = {}
            if r in inst["pricing"]:
                per_region_out[i]["pricing"][r] = instances[i]["pricing"][r]
            if "availability_zones" in inst and r in inst["availability_zones"]:
                per_region_out[i]["availability_zones"][r] = instances[i][
                    "availability_zones"
                ][r]

        pricing_out_file = "{}pricing_{}.json".format(outdir, r)
        azs_out_file = "{}instance_azs_{}.json".format(outdir, r)

        pricing_json = compress_pricing(per_region_out)
        instance_azs_json = compress_instance_azs(per_region_out)

        if r == "eastus":
            init_pricing_json = pricing_json
            init_instance_azs_json = instance_azs_json

        with open(pricing_out_file, "w+") as f:
            f.write(pricing_json)
        with open(azs_out_file, "w+") as f:
            f.write(instance_azs_json)

    return init_pricing_json, init_instance_azs_json


def render_azure(data_file, template_file, destination_file, detail_pages=True):
    """Build the HTML content from scraped data"""
    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename=template_file, lookup=lookup)
    with open(data_file, "r") as f:
        instances = json.load(f)
    
    remove_prefix(instances)

    print("Loading data from %s..." % data_file)
    for i in instances:
        add_render_info(i)

    generated_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    pricing_json, instance_azs_json = per_region_pricing(instances, data_file)

    sitemap = []
    if detail_pages:
        if data_file == "www/azure/instances.json":
            sitemap.extend(build_detail_pages_azure(instances, destination_file))

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
            sitemap.append(destination_file)
        except:
            print(mako.exceptions.text_error_template().render())

    return sitemap


if __name__ == "__main__":
    render_azure("www/azure/instances.json", "in/azure.html.mako", "www/azure/index.html", True)
