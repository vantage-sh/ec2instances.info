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
    "ec2",
    "cache",
    "rds",
    "opensearch",
    "redshift",
    "azure",
] as const;

export type MarketingSchema = {
    ctas: Record<
        string,
        {
            title: string;
            cta_text: string;
            cta_url: string;
        }
    >;
    promotions: Partial<
        Record<(typeof ALLOWED_PROMOTIONS)[number], Promotion[]>
    >;
};

export type InstanceGroupType = keyof MarketingSchema["promotions"];

export function validateMarketing(data: unknown): MarketingSchema {
    // I'm not sure why I need to do this, valibot seems to error for some people.
    // Besides though, this does let us check the relationship for the ctas and promotions.
    // So that's cool I guess?

    if (typeof data !== "object" || data === null) {
        throw new Error("Marketing data must be an object");
    }

    // Validate the ctas
    const ctas = (
        data as {
            ctas: Record<
                string,
                {
                    title: string;
                    cta_text: string;
                    cta_url: string;
                }
            >;
        }
    ).ctas;
    if (typeof ctas !== "object" || ctas === null || Array.isArray(ctas)) {
        throw new Error("Marketing data must have a ctas object");
    }
    for (const cta of Object.values(ctas)) {
        if (typeof cta !== "object" || cta === null) {
            throw new Error("CTA must be an object");
        }

        if (typeof cta.title !== "string") {
            throw new Error("CTA title must be a string");
        }

        if (typeof cta.cta_text !== "string") {
            throw new Error("CTA cta_text must be a string");
        }

        if (typeof cta.cta_url !== "string") {
            throw new Error("CTA cta_url must be a string");
        }
    }

    // Validate the promotions
    const promotions = (
        data as {
            promotions: Partial<
                Record<(typeof ALLOWED_PROMOTIONS)[number], Promotion[]>
            >;
        }
    ).promotions;
    if (typeof promotions !== "object" || promotions === null) {
        throw new Error("Marketing data must have a promotions object");
    }
    for (const [promoKey, promoValues] of Object.entries(promotions)) {
        if (!ALLOWED_PROMOTIONS.includes(promoKey as InstanceGroupType)) {
            throw new Error(`Invalid promotion key: ${promoKey}`);
        }

        if (!Array.isArray(promoValues)) {
            throw new Error(`Promotion values must be an array`);
        }

        for (const promotion of promoValues) {
            if (typeof promotion !== "object" || promotion === null) {
                throw new Error("Promotion must be an object");
            }

            if (!(promotion.cta in ctas)) {
                throw new Error(`CTA ${promotion.cta} not found`);
            }

            if (promotion.if) {
                if (typeof promotion.if !== "object" || promotion.if === null) {
                    throw new Error("Promotion if must be an object");
                }

                const entries = Object.entries(promotion.if);
                if (entries.length === 0) {
                    delete promotion.if;
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
        }
    }

    // Return all of the validated data
    return {
        ctas,
        promotions,
    };
}
