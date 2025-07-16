import {
    string,
    array,
    object,
    boolean,
    optional,
    number,
    record,
    InferOutput,
    parse,
} from "valibot";

export const promotion = object({
    cta: string(),
    if: optional(
        object({
            uses_gt: optional(number()),
            gpu: optional(boolean()),
            ab: optional(boolean()),
        }),
    ),
});

export const promotions = optional(array(promotion));

export const marketing = object({
    ctas: record(
        string(),
        object({
            title: string(),
            cta_text: string(),
            cta_url: string(),
        }),
    ),
    promotions: object({
        generic: promotions,
        ec2: promotions,
        cache: promotions,
        rds: promotions,
        opensearch: promotions,
        redshift: promotions,
        azure: promotions,
    }),
});

export type MarketingSchema = InferOutput<typeof marketing>;

export type InstanceGroupType = keyof MarketingSchema["promotions"];

export function validateMarketing(data: unknown): MarketingSchema {
    const res = parse(marketing, data);
    for (const val of Object.values(res.promotions)) {
        if (val) {
            for (const promotion of val) {
                const cta = res.ctas[promotion.cta];
                if (!cta) {
                    throw new Error(`CTA ${promotion.cta} not found`);
                }
            }
        }
    }
    return res;
}
