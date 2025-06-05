function keysWhereODIsNotZero<
    RegionPricing extends {
        [platform: string]: {
            ondemand: string | number;
        };
    },
>(regionPricing: RegionPricing) {
    return Object.keys(regionPricing).filter(
        (platform) =>
            regionPricing[platform].ondemand !== "0" &&
            regionPricing[platform].ondemand,
    );
}

export default function tryPricingMappingWithDefaultsAndYoloIfNot<
    Pricing extends {
        [region: string]: {
            [platform: string]: {
                ondemand: string | number;
            };
        };
    },
>(pricing: Pricing, defaultRegion: string) {
    const regionRoot =
        pricing[defaultRegion] || pricing[Object.keys(pricing)[0]];
    if (!regionRoot) return undefined;
    let platformRoot = regionRoot["linux"];
    if (!platformRoot) {
        const platformKeys = keysWhereODIsNotZero(regionRoot);
        if (platformKeys.length === 0) return undefined;
        platformRoot = regionRoot[platformKeys[0]];
    }
    return platformRoot?.ondemand;
}
