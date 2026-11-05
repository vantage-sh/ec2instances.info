import {
    buildVantageUrl,
    type UtmCampaign,
    type UtmMedium,
} from "./buildVantageUrl";

export type MarketingLink = {
    label: string;
    baseUrl: string;
    utm_medium?: UtmMedium;
    utm_campaign?: UtmCampaign;
    utm_content?: string;
    enabled: boolean;
};

export type ResolvedLink = {
    label: string;
    href: string;
};

/**
 * Resolve a marketing link entry into a final href.
 * Non-Vantage links (no utm_medium) are returned untagged.
 */
export function resolveMarketingLink(
    link: MarketingLink,
    pageContent?: string,
): ResolvedLink | null {
    if (!link.enabled) return null;

    const content = link.utm_content ?? pageContent;
    if (link.utm_medium && link.utm_campaign) {
        return {
            label: link.label,
            href: buildVantageUrl(link.baseUrl, {
                medium: link.utm_medium,
                campaign: link.utm_campaign,
                content,
            }),
        };
    }

    return { label: link.label, href: link.baseUrl };
}
