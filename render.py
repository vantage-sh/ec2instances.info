import mako.template
import mako.lookup
import mako.exceptions
import io
import json
import datetime
import os
import copy
import yaml

from detail_pages_ec2 import build_detail_pages_ec2
from detail_pages_rds import build_detail_pages_rds
from detail_pages_cache import build_detail_pages_cache
from detail_pages_opensearch import build_detail_pages_opensearch
from detail_pages_redshift import build_detail_pages_redshift
from render_azure import render_azure


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
        if "vCPU" in i:
            # only EC2 uses vCPU
            i["memory_per_vcpu"] = round(i["memory"] / i["vCPU"], 2)
        else:
            i["memory_per_vcpu"] = round(float(i["memory"]) / float(i["vcpu"]), 2)
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
    try:
        i["network_sort"] = network_sort(i)
    except KeyError:
        # This instance, probably from a non EC2 service, does not have traditional networking specs
        pass
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


def about_page(destination_file="www/about.html"):
    print("Rendering to %s..." % destination_file)
    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename="in/about.html.mako", lookup=lookup)
    generated_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    os.makedirs(os.path.dirname(destination_file), exist_ok=True)
    with io.open(destination_file, "w+", encoding="utf-8") as fh:
        try:
            fh.write(template.render(generated_at=generated_at))
        except:
            print(mako.exceptions.text_error_template().render())
    return destination_file


def build_sitemap(sitemap):
    HOST = "https://instances.vantage.sh"
    surls = ['<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in sitemap:
        surl = url.replace("www/", "")
        if "index" in surl:
            surl = surl.replace("index", "")
        surls.append("<url><loc>{}/{}</loc></url>".format(HOST, surl[0:-5]))
    surls.append("</urlset>")

    destination_file = "www/sitemap.xml"
    print("Rendering all URLs to %s..." % destination_file)
    with io.open(destination_file, "w+") as fp:
        fp.write("\n".join(surls))


def per_region_pricing(instances, data_file):
    # This function splits instances.json into per-region files which are written to
    # disk and then can be loaded by the web app to reduce the amount of data that
    # needs to be sent to the client.

    region_list = "meta/regions_aws.yaml"
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

        if r == "us-east-1":
            init_pricing_json = pricing_json
            init_instance_azs_json = instance_azs_json

        with open(pricing_out_file, "w+") as f:
            f.write(pricing_json)
        with open(azs_out_file, "w+") as f:
            f.write(instance_azs_json)

    return init_pricing_json, init_instance_azs_json


def render(data_file, template_file, destination_file, detail_pages=True):
    """Build the HTML content from scraped data"""
    lookup = mako.lookup.TemplateLookup(directories=["."])
    template = mako.template.Template(filename=template_file, lookup=lookup)
    with open(data_file, "r") as f:
        instances = json.load(f)

    print("Loading data from %s..." % data_file)
    for i in instances:
        add_render_info(i)

    generated_at = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    pricing_json, instance_azs_json = per_region_pricing(instances, data_file)

    sitemap = []
    if detail_pages:
        if data_file == "www/instances.json":
            sitemap.extend(build_detail_pages_ec2(instances, destination_file))
        elif data_file == "www/rds/instances.json":
            sitemap.extend(build_detail_pages_rds(instances, destination_file))
        elif data_file == "www/cache/instances.json":
            sitemap.extend(build_detail_pages_cache(instances, destination_file))
        elif data_file == "www/opensearch/instances.json":
            sitemap.extend(build_detail_pages_opensearch(instances, destination_file))
        elif data_file == "www/redshift/instances.json":
            sitemap.extend(build_detail_pages_redshift(instances, destination_file))

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
    sitemap = []
    sitemap.extend(render("www/instances.json", "in/index.html.mako", "www/index.html"))
    sitemap.extend(
        render("www/rds/instances.json", "in/rds.html.mako", "www/rds/index.html")
    )
    sitemap.extend(
        render(
            "www/cache/instances.json",
            "in/cache.html.mako",
            "www/cache/index.html",
        )
    )
    sitemap.extend(
        render(
            "www/redshift/instances.json",
            "in/redshift.html.mako",
            "www/redshift/index.html",
        )
    )
    sitemap.extend(
        render(
            "www/opensearch/instances.json",
            "in/opensearch.html.mako",
            "www/opensearch/index.html",
        )
    )
    sitemap.extend(
        render_azure(
            "www/azure/instances.json", "in/azure.html.mako", "www/azure/index.html"
        )
    )
    sitemap.append(about_page())
    build_sitemap(sitemap)
