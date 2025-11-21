function titleCase(str: string) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function generateGcpDescription<
    Instance extends {
        instance_type: string;
        pretty_name: string;
        family: string;
        vCPU: number;
        memory: number;
        pricing: {
            [region: string]: {
                [platform: string]: {
                    ondemand: number | string;
                    spot?: number | string;
                };
            };
        };
    },
>(instance: Instance) {
    let region = instance.pricing["us-east1"];
    if (!region) {
        region = instance.pricing[Object.keys(instance.pricing)[0]];
    }
    let platform = region?.["linux"];
    if (!platform) {
        platform = region?.[Object.keys(region)[0] as keyof typeof region];
    }
    if (!platform) {
        throw new Error(`No platform found for ${instance.instance_type}`);
    }

    const onDemand = Number(platform.ondemand);
    const spot = platform.spot ? Number(platform.spot) : undefined;

    let spotText = "";
    if (spot && !isNaN(spot)) {
        spotText = ` or $${spot.toFixed(4)} per hour with spot instances`;
    }
    return `The ${instance.pretty_name} is in the ${titleCase(instance.family)} family with ${instance.vCPU} vCPUs and ${instance.memory} GiB of memory starting at $${onDemand.toFixed(4)} per hour on-demand${spotText}.`;
}
