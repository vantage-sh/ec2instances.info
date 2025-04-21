import { Instance, Region } from './types';
import { readFile } from 'fs/promises';
import Client from './Client';

async function loadInstancesAndRegions(): Promise<[Instance[], Region]> {
  const regions: Region = {
    main: {},
    local_zone: {},
    wavelength: {},
  };
  const instances = JSON.parse(await readFile('../www/instances.json', 'utf8'));
  for (const instance of instances) {
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
