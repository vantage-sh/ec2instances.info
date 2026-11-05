import { marketingData } from "@/utils/loadAdvertData";
import { resolveMarketingLink } from "./resolvePlacement";
import { buildVantageUrl } from "./buildVantageUrl";
import type { BannerCta, BlogCard, ToastConfig } from "@/schemas/marketing";

export function getPlacement(key: string, pageContent?: string) {
    const link = marketingData.placements[key];
    if (!link) {
        throw new Error(`Unknown marketing placement: ${key}`);
    }
    return resolveMarketingLink(link, pageContent);
}

export function resolveBannerCta(cta: BannerCta, pageContent?: string): string {
    return buildVantageUrl(cta.baseUrl, {
        medium: cta.utm_medium,
        campaign: cta.utm_campaign,
        content: cta.utm_content ?? pageContent,
    });
}

export function resolveBlogCard(
    card: BlogCard,
    pageContent?: string,
): { title: string; description: string; image: string; href: string } {
    return {
        title: card.title,
        description: card.description,
        image: card.image,
        href: buildVantageUrl(card.baseUrl, {
            medium: card.utm_medium,
            campaign: card.utm_campaign,
            content: card.utm_content ?? pageContent,
        }),
    };
}

export function resolveToast(
    toast: ToastConfig,
    pageContent?: string,
): {
    campaign_id: string;
    message: string;
    image_alt_text?: string;
    image_url?: string;
    url: string;
    countries?: string[];
} {
    return {
        campaign_id: toast.campaign_id,
        message: toast.message,
        image_alt_text: toast.image_alt_text,
        image_url: toast.image_url,
        countries: toast.countries,
        url: buildVantageUrl(toast.baseUrl, {
            medium: toast.utm_medium,
            campaign: toast.utm_campaign,
            content: toast.utm_content ?? pageContent,
        }),
    };
}

export { buildVantageUrl } from "./buildVantageUrl";
export { utmContentFromPath } from "./utmContentFromPath";
export { marketingData };
