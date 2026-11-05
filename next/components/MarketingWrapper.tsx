"use client";

import { MarketingSchema } from "@/schemas/marketing";
import Advert from "./Advert";
import { resolveBlogCard, utmContentFromPath } from "@/utils/marketing";
import { usePathname } from "next/navigation";

const ItemsWrapper = ({ children }: { children: React.ReactNode }) => (
    <section className="not-xl:flex not-xl:flex-wrap not-xl:w-screen gap-4 mt-4">
        {children}
    </section>
);

type ItemProps = {
    link: string;
    image: string;
    title: string;
    description: string;
};

const Item = ({ link, image, title, description }: ItemProps) => (
    <a href={link} target="_blank" className="not-sm:mx-auto">
        <div className="xl:mt-4 flex-col border border-gray-200 dark:border-gray-3 rounded-md p-4 w-xs xl:w-3xs 2xl:w-xs">
            <img
                src={image}
                alt={title}
                className="w-full h-40 object-cover rounded-md"
            />
            <h3
                className="text-md not-xl:text-sm xl:text-xs 2xl:text-sm font-semibold mt-2 leading-tight mb-1"
                aria-hidden="true"
            >
                {title}
            </h3>
            <p className="text-xs not-xl:text-2xs xl:text-3xs 2xl:text-2xs text-gray-2">
                {description}
            </p>
        </div>
    </a>
);

function BlogCards({
    group,
    marketingData,
}: {
    group: string;
    marketingData: MarketingSchema;
}) {
    const pathname = usePathname();
    const pageContent = utmContentFromPath(pathname);
    const cards = (marketingData.blogCards[group] || []).filter(
        (c) => c.enabled,
    );
    if (cards.length === 0) return null;

    return (
        <ItemsWrapper>
            {cards.map((card) => {
                const resolved = resolveBlogCard(card, pageContent);
                return (
                    <Item
                        key={resolved.href}
                        link={resolved.href}
                        image={resolved.image}
                        title={resolved.title}
                        description={resolved.description}
                    />
                );
            })}
        </ItemsWrapper>
    );
}

type MarketingWrapperProps = {
    instanceType: string;
    marketingData: MarketingSchema;
    children: React.ReactNode;
};

const ITEMS = [
    "ec2",
    "azure",
    "rds",
    "opensearch",
    "redshift",
    "cache",
    "gcp",
] as const;

function processGroup(instanceType: string) {
    const s = instanceType.split("-");
    if (s[0] === "elasticache") {
        return "cache";
    }
    if (ITEMS.includes(s[0] as (typeof ITEMS)[number])) {
        return s[0] as (typeof ITEMS)[number];
    }
    throw new Error(`Unknown instance type: ${instanceType}`);
}

function blogCardGroup(instanceType: string): string {
    switch (instanceType) {
        case "azure":
        case "ec2-flex":
        case "ec2-gpu":
        case "ec2-other":
        case "rds":
        case "opensearch":
        case "redshift":
        case "elasticache":
        case "gcp":
            return instanceType;
        default:
            throw new Error(`Unknown instance type: ${instanceType}`);
    }
}

export default function MarketingWrapper({
    instanceType,
    children,
    marketingData,
}: MarketingWrapperProps) {
    if (process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1") return children;

    return (
        <>
            <Advert
                marketingData={marketingData}
                instanceGroup={`${processGroup(instanceType)}-instances`}
                gpu={instanceType.endsWith("-gpu")}
            />
            <div className="w-full" data-wrapper="true">
                <div className="xl:flex gap-4 mx-auto w-max">
                    <div className="flex-col">{children}</div>
                    <div className="flex-col">
                        <BlogCards
                            group={blogCardGroup(instanceType)}
                            marketingData={marketingData}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
