export const UTM_SOURCE = "instances" as const;

export const UTM_MEDIUMS = [
    "nav",
    "footer",
    "toast",
    "banner",
    "sidebar",
    "blog-card",
    "inline",
] as const;

export type UtmMedium = (typeof UTM_MEDIUMS)[number];

export const UTM_CAMPAIGNS = [
    "instances_signup",
    "instances_demo",
    "instances_mcp",
    "instances_api",
    "instances_newsletter",
    "instances_content",
    "instances_crosspromo",
] as const;

export type UtmCampaign = (typeof UTM_CAMPAIGNS)[number];

export type BuildVantageUrlOptions = {
    medium: UtmMedium;
    campaign: UtmCampaign;
    content?: string;
};

/**
 * Attach standard Instances UTMs to a Vantage URL.
 * Preserves existing query params and encodes values correctly.
 */
export function buildVantageUrl(
    baseUrl: string,
    { medium, campaign, content }: BuildVantageUrlOptions,
): string {
    const url = new URL(baseUrl);
    url.searchParams.set("utm_source", UTM_SOURCE);
    url.searchParams.set("utm_medium", medium);
    url.searchParams.set("utm_campaign", campaign);
    if (content !== undefined && content !== "") {
        url.searchParams.set("utm_content", content);
    }
    return url.toString();
}
