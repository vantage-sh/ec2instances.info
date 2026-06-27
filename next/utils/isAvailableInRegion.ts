// Region availability predicate shared by the listing table.
//
// An instance is offered in a region if, and only if, the scraper produced a
// pricing entry for that region. This mirrors the instance detail page's
// pricing calculator, which disables a region option with `disabled={!pricing[code]}`
// (see components/PricingCalculator.tsx). The listing table reuses the same
// notion so that selecting a region hides instances that region does not offer
// (e.g. m8i.2xlarge is not available in eu-north-1 / Stockholm).
//
// The check is intentionally tolerant of the differing pricing shapes across
// providers: EC2/Azure/GCP key `pricing[region]` directly by platform, while
// RDS nests an extra engine/version level. In every case the region key is
// absent when the instance is not offered there, so a presence check on
// `pricing[region]` is sufficient and provider-agnostic.

type MaybePricedInstance = {
    pricing?: { [region: string]: unknown };
    [key: string]: unknown;
};

export default function isAvailableInRegion(
    instance: MaybePricedInstance,
    region: string,
): boolean {
    const pricing = instance.pricing;
    // Instances with no pricing map at all (e.g. providers that do not carry
    // region pricing) are never filtered out, so the table keeps its previous
    // behaviour for them.
    if (!pricing || Object.keys(pricing).length === 0) return true;

    const regionPricing = pricing[region];
    if (!regionPricing) return false;

    // Guard against an empty object being present for a region the instance is
    // not actually offered in.
    if (
        typeof regionPricing === "object" &&
        Object.keys(regionPricing as object).length === 0
    ) {
        return false;
    }

    return true;
}
