function titleCase(str: string) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function generateAzureDescription<
    Instance extends {
        instance_type: string;
        family: string;
        vcpu: number;
        memory: number;
        pretty_name_azure: string;
        pricing: {
            [region: string]: {
                linux?: {
                    ondemand?: string;
                    spot_min?: string;
                };
                windows?: {
                    ondemand?: string;
                    spot_min?: string;
                };
            };
        };
    },
>(instance: Instance) {
    let region = instance.pricing["us-east"];
    if (!region) {
        region = instance.pricing[Object.keys(instance.pricing)[0]];
    }
    let platform = region.linux;
    if (!platform) {
        platform = region.windows;
        if (!platform) {
            platform = region[Object.keys(region)[0] as keyof typeof region];
        }
    }
    if (!platform) {
        throw new Error(`No platform found for ${instance.instance_type}`);
    }

    const onDemand = platform.ondemand;
    const spot = platform.spot_min;

    let spotText = "";
    if (spot) {
        spotText = ` or $${spot} per hour with spot instances`;
    }
    return `The ${instance.pretty_name_azure} is in the ${titleCase(instance.family)} series with ${instance.vcpu} vCPUs and ${instance.memory} GiB of memory starting at $${onDemand} per hour on-demand${spotText}.`;
}
