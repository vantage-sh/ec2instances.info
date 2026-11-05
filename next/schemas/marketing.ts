import {
    UTM_CAMPAIGNS,
    UTM_MEDIUMS,
    type UtmCampaign,
    type UtmMedium,
} from "@/utils/marketing/buildVantageUrl";
import type { MarketingLink } from "@/utils/marketing/resolvePlacement";

const TYPE_MAPPING = {
    uses_gt: "number",
    gpu: "boolean",
    ab: "boolean",
    homepage: "boolean",
} as const;

type InverseType = {
    string: string;
    number: number;
    bigint: bigint;
    boolean: boolean;
    object: object;
};

export type PromotionIf = {
    [K in keyof typeof TYPE_MAPPING]?: InverseType[(typeof TYPE_MAPPING)[K]];
};

type Promotion = {
    cta: string;
    if?: PromotionIf;
};

const ALLOWED_PROMOTIONS = [
    "generic",
    "gcp-instances",
    "gcp-home",
    "ec2-instances",
    "ec2-home",
    "cache-instances",
    "cache-home",
    "rds-instances",
    "rds-home",
    "opensearch-instances",
    "opensearch-home",
    "redshift-instances",
    "redshift-home",
    "azure-instances",
    "azure-home",
] as const;

export type BannerCta = {
    title: string;
    cta_text: string;
    baseUrl: string;
    utm_medium: UtmMedium;
    utm_campaign: UtmCampaign;
    utm_content?: string;
    enabled: boolean;
};

export type BlogCard = {
    title: string;
    description: string;
    image: string;
    baseUrl: string;
    utm_medium: UtmMedium;
    utm_campaign: UtmCampaign;
    utm_content?: string;
    enabled: boolean;
};

export type ToastConfig = {
    campaign_id: string;
    message: string;
    image_alt_text?: string;
    image_url?: string;
    baseUrl: string;
    utm_medium: UtmMedium;
    utm_campaign: UtmCampaign;
    utm_content?: string;
    countries?: string[];
    enabled: boolean;
};

export type MarketingSchema = {
    placements: Record<string, MarketingLink>;
    banners: {
        backgroundImage: string;
        ctas: Record<string, BannerCta>;
        promotions: Partial<
            Record<(typeof ALLOWED_PROMOTIONS)[number], Promotion[]>
        >;
    };
    toasts: ToastConfig[];
    blogCards: Record<string, BlogCard[]>;
};

export type InstanceGroupType = keyof MarketingSchema["banners"]["promotions"];

function assertUtmMedium(value: unknown, ctx: string): UtmMedium {
    if (
        typeof value !== "string" ||
        !UTM_MEDIUMS.includes(value as UtmMedium)
    ) {
        throw new Error(
            `${ctx} utm_medium must be one of: ${UTM_MEDIUMS.join(", ")}`,
        );
    }
    return value as UtmMedium;
}

function assertUtmCampaign(value: unknown, ctx: string): UtmCampaign {
    if (
        typeof value !== "string" ||
        !UTM_CAMPAIGNS.includes(value as UtmCampaign)
    ) {
        throw new Error(
            `${ctx} utm_campaign must be one of: ${UTM_CAMPAIGNS.join(", ")}`,
        );
    }
    return value as UtmCampaign;
}

function validateLink(link: unknown, ctx: string): MarketingLink {
    if (typeof link !== "object" || link === null) {
        throw new Error(`${ctx} must be an object`);
    }
    const l = link as Record<string, unknown>;
    if (typeof l.label !== "string")
        throw new Error(`${ctx}.label must be a string`);
    if (typeof l.baseUrl !== "string")
        throw new Error(`${ctx}.baseUrl must be a string`);
    if (typeof l.enabled !== "boolean")
        throw new Error(`${ctx}.enabled must be a boolean`);

    const result: MarketingLink = {
        label: l.label,
        baseUrl: l.baseUrl,
        enabled: l.enabled,
    };
    if (l.utm_medium !== undefined) {
        result.utm_medium = assertUtmMedium(l.utm_medium, ctx);
    }
    if (l.utm_campaign !== undefined) {
        result.utm_campaign = assertUtmCampaign(l.utm_campaign, ctx);
    }
    if (l.utm_content !== undefined) {
        if (typeof l.utm_content !== "string") {
            throw new Error(`${ctx}.utm_content must be a string`);
        }
        result.utm_content = l.utm_content;
    }
    if (
        (result.utm_medium && !result.utm_campaign) ||
        (!result.utm_medium && result.utm_campaign)
    ) {
        throw new Error(
            `${ctx} must set both utm_medium and utm_campaign, or neither`,
        );
    }
    return result;
}

function validateBannerCta(cta: unknown, ctx: string): BannerCta {
    if (typeof cta !== "object" || cta === null) {
        throw new Error(`${ctx} must be an object`);
    }
    const c = cta as Record<string, unknown>;
    if (typeof c.title !== "string")
        throw new Error(`${ctx}.title must be a string`);
    if (typeof c.cta_text !== "string")
        throw new Error(`${ctx}.cta_text must be a string`);
    if (typeof c.baseUrl !== "string")
        throw new Error(`${ctx}.baseUrl must be a string`);
    if (typeof c.enabled !== "boolean")
        throw new Error(`${ctx}.enabled must be a boolean`);
    const result: BannerCta = {
        title: c.title,
        cta_text: c.cta_text,
        baseUrl: c.baseUrl,
        utm_medium: assertUtmMedium(c.utm_medium, ctx),
        utm_campaign: assertUtmCampaign(c.utm_campaign, ctx),
        enabled: c.enabled,
    };
    if (c.utm_content !== undefined) {
        if (typeof c.utm_content !== "string") {
            throw new Error(`${ctx}.utm_content must be a string`);
        }
        result.utm_content = c.utm_content;
    }
    return result;
}

function validateBlogCard(card: unknown, ctx: string): BlogCard {
    if (typeof card !== "object" || card === null) {
        throw new Error(`${ctx} must be an object`);
    }
    const c = card as Record<string, unknown>;
    if (typeof c.title !== "string")
        throw new Error(`${ctx}.title must be a string`);
    if (typeof c.description !== "string")
        throw new Error(`${ctx}.description must be a string`);
    if (typeof c.image !== "string")
        throw new Error(`${ctx}.image must be a string`);
    if (typeof c.baseUrl !== "string")
        throw new Error(`${ctx}.baseUrl must be a string`);
    if (typeof c.enabled !== "boolean")
        throw new Error(`${ctx}.enabled must be a boolean`);
    const result: BlogCard = {
        title: c.title,
        description: c.description,
        image: c.image,
        baseUrl: c.baseUrl,
        utm_medium: assertUtmMedium(c.utm_medium, ctx),
        utm_campaign: assertUtmCampaign(c.utm_campaign, ctx),
        enabled: c.enabled,
    };
    if (c.utm_content !== undefined) {
        if (typeof c.utm_content !== "string") {
            throw new Error(`${ctx}.utm_content must be a string`);
        }
        result.utm_content = c.utm_content;
    }
    return result;
}

function validateToast(toast: unknown, ctx: string): ToastConfig {
    if (typeof toast !== "object" || toast === null) {
        throw new Error(`${ctx} must be an object`);
    }
    const t = toast as Record<string, unknown>;
    if (typeof t.campaign_id !== "string")
        throw new Error(`${ctx}.campaign_id must be a string`);
    if (typeof t.message !== "string")
        throw new Error(`${ctx}.message must be a string`);
    if (typeof t.baseUrl !== "string")
        throw new Error(`${ctx}.baseUrl must be a string`);
    if (typeof t.enabled !== "boolean")
        throw new Error(`${ctx}.enabled must be a boolean`);
    const result: ToastConfig = {
        campaign_id: t.campaign_id,
        message: t.message,
        baseUrl: t.baseUrl,
        utm_medium: assertUtmMedium(t.utm_medium, ctx),
        utm_campaign: assertUtmCampaign(t.utm_campaign, ctx),
        enabled: t.enabled,
    };
    if (t.image_alt_text !== undefined) {
        if (typeof t.image_alt_text !== "string") {
            throw new Error(`${ctx}.image_alt_text must be a string`);
        }
        result.image_alt_text = t.image_alt_text;
    }
    if (t.image_url !== undefined) {
        if (typeof t.image_url !== "string") {
            throw new Error(`${ctx}.image_url must be a string`);
        }
        result.image_url = t.image_url;
    }
    if (t.utm_content !== undefined) {
        if (typeof t.utm_content !== "string") {
            throw new Error(`${ctx}.utm_content must be a string`);
        }
        result.utm_content = t.utm_content;
    }
    if (t.countries !== undefined) {
        if (
            !Array.isArray(t.countries) ||
            t.countries.some((c) => typeof c !== "string")
        ) {
            throw new Error(`${ctx}.countries must be a string array`);
        }
        result.countries = t.countries as string[];
    }
    return result;
}

export function validateMarketing(data: unknown): MarketingSchema {
    if (typeof data !== "object" || data === null) {
        throw new Error("Marketing data must be an object");
    }

    const raw = data as Record<string, unknown>;

    if (typeof raw.placements !== "object" || raw.placements === null) {
        throw new Error("Marketing data must have a placements object");
    }
    const placements: Record<string, MarketingLink> = {};
    for (const [key, value] of Object.entries(raw.placements)) {
        placements[key] = validateLink(value, `placements.${key}`);
    }

    if (typeof raw.banners !== "object" || raw.banners === null) {
        throw new Error("Marketing data must have a banners object");
    }
    const bannersRaw = raw.banners as Record<string, unknown>;
    if (typeof bannersRaw.backgroundImage !== "string") {
        throw new Error("banners.backgroundImage must be a string");
    }
    if (typeof bannersRaw.ctas !== "object" || bannersRaw.ctas === null) {
        throw new Error("banners.ctas must be an object");
    }
    const ctas: Record<string, BannerCta> = {};
    for (const [key, value] of Object.entries(bannersRaw.ctas)) {
        ctas[key] = validateBannerCta(value, `banners.ctas.${key}`);
    }

    if (
        typeof bannersRaw.promotions !== "object" ||
        bannersRaw.promotions === null
    ) {
        throw new Error("banners.promotions must be an object");
    }
    const promotions: MarketingSchema["banners"]["promotions"] = {};
    for (const [promoKey, promoValues] of Object.entries(
        bannersRaw.promotions as Record<string, unknown>,
    )) {
        if (!ALLOWED_PROMOTIONS.includes(promoKey as InstanceGroupType)) {
            throw new Error(`Invalid promotion key: ${promoKey}`);
        }
        if (!Array.isArray(promoValues)) {
            throw new Error(`Promotion values must be an array`);
        }
        const list: Promotion[] = [];
        for (const promotion of promoValues) {
            if (typeof promotion !== "object" || promotion === null) {
                throw new Error("Promotion must be an object");
            }
            const p = promotion as { cta: string; if?: PromotionIf };
            if (!(p.cta in ctas)) {
                throw new Error(`CTA ${p.cta} not found`);
            }
            if (p.if) {
                if (typeof p.if !== "object" || p.if === null) {
                    throw new Error("Promotion if must be an object");
                }
                const entries = Object.entries(p.if);
                if (entries.length === 0) {
                    delete p.if;
                } else {
                    for (const [key, value] of entries) {
                        if (!(key in TYPE_MAPPING)) {
                            throw new Error(`Invalid promotion if key: ${key}`);
                        }
                        if (
                            typeof value !==
                            TYPE_MAPPING[key as keyof typeof TYPE_MAPPING]
                        ) {
                            throw new Error(
                                `Promotion if value must be a ${TYPE_MAPPING[key as keyof typeof TYPE_MAPPING]}`,
                            );
                        }
                    }
                }
            }
            list.push(p);
        }
        promotions[promoKey as InstanceGroupType] = list;
    }

    if (!Array.isArray(raw.toasts)) {
        throw new Error("Marketing data must have a toasts array");
    }
    const toasts = raw.toasts.map((t, i) => validateToast(t, `toasts[${i}]`));

    if (typeof raw.blogCards !== "object" || raw.blogCards === null) {
        throw new Error("Marketing data must have a blogCards object");
    }
    const blogCards: Record<string, BlogCard[]> = {};
    for (const [key, value] of Object.entries(raw.blogCards)) {
        if (!Array.isArray(value)) {
            throw new Error(`blogCards.${key} must be an array`);
        }
        blogCards[key] = value.map((card, i) =>
            validateBlogCard(card, `blogCards.${key}[${i}]`),
        );
    }

    return {
        placements,
        banners: {
            backgroundImage: bannersRaw.backgroundImage,
            ctas,
            promotions,
        },
        toasts,
        blogCards,
    };
}
