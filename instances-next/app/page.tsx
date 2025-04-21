import { Instance, Region } from './types';
import { readFile } from 'fs/promises';
import Client from './Client';

/**
 * 
 * def network_sort(inst):
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
 */

function networkSort(instance: Instance) {
    const perf = instance.network_performance;
    const network_rank = [
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
    ];
    try {
        const sort = network_rank.indexOf(perf);
        return sort * 2;
    } catch {
        return network_rank.length * 2;
    }
}

function addCpuDetail(instance: Instance) {
  if (typeof instance.ECU === 'number' && typeof instance.vCPU === 'number') {
    instance.ECU_per_vcpu = instance.ECU / instance.vCPU;
  } else {
      instance.ECU_per_vcpu = "unknown";
  }
  if (typeof instance.vCPU === 'number') {
    instance.memory_per_vcpu = Math.round(instance.memory / instance.vCPU * 100) / 100;
  } else {
    instance.memory_per_vcpu = "unknown";
  }
  if (instance.physical_processor) {
    instance.physical_processor = instance.physical_processor.replace('*', '');
  }
}
function addRenderInfo(instance: Instance) {
    try {
        instance.network_sort = networkSort(instance);
    } catch {}
    addCpuDetail(instance);
}

async function loadInstancesAndRegions(): Promise<[Instance[], Region]> {
  const regions: Region = {
    main: {},
    local_zone: {},
    wavelength: {},
  };
  const instances = JSON.parse(await readFile('../www/instances.json', 'utf8'));
  for (const instance of instances) {
    addRenderInfo(instance);
    for (const r in instance.pricing) {
      if (r.includes('wl1') || r.includes('wl2')) {
        regions.wavelength[r] = instance.regions[r];
      } else if (/\d+/.test(r)) {
        regions.local_zone[r] = instance.regions[r];
      } else {
        regions.main[r] = instance.regions[r];
      }
    }
  }
  return [instances, regions];
}

export default async function Home() {
  const [instances, regions] = await loadInstancesAndRegions();

  return (
    <Client instances={instances} regions={regions} />
  );
}
