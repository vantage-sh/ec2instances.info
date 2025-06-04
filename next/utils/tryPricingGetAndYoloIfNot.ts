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
    const platformRoot =
        regionRoot["linux"] || regionRoot[Object.keys(regionRoot)[0]];
    return platformRoot?.ondemand;
}
