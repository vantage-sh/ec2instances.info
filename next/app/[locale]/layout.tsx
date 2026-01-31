import { GTProvider } from "gt-next";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import AdToasts from "@/components/AdToasts";
import { Toaster } from "@/components/ui/sonner";
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";
import { array, object, string, parse, optional } from "valibot";
import {
    getFontClassName,
    isRTL,
    SUPPORTED_LOCALES,
    type SupportedLocale,
} from "@/utils/fonts";

const toastsSchema = array(
    object({
        campaign_id: string(),
        message: string(),
        image_alt_text: optional(string()),
        image_url: optional(string()),
        url: string(),
        countries: optional(array(string())),
    }),
);

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const dir = isRTL(locale) ? "rtl" : "ltr";
    const fontClassName = getFontClassName(locale);

    const initialToasts = await fetch(
        "https://instances.vantage.sh/toasts.json",
    ).then(async (r) => {
        if (!r.ok) {
            throw new Error(
                `Failed to fetch toasts: ${r.status} ${r.statusText}`,
            );
        }
        return parse(toastsSchema, await r.json());
    });

    return (
        <html lang={locale} dir={dir}>
            <head>
                <link rel="icon" href="/favicon.png" />
                <link
                    rel="sitemap"
                    type="application/xml"
                    title="Sitemap"
                    href="/sitemap_index.xml"
                />
                {process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID && (
                    <GoogleTagManager
                        gtmId={process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID}
                    />
                )}
                {process.env.NEXT_PUBLIC_ENABLE_VANTAGE_SCRIPT_TAG === "1" && (
                    <Script
                        src="https://vantage-api.com/i.js"
                        strategy="afterInteractive"
                    />
                )}
                {process.env.NEXT_PUBLIC_UNIFY_TAG_ID && (
                    <Script
                        src={`https://tag.unifyintent.com/v1/${process.env.NEXT_PUBLIC_UNIFY_TAG_ID}/script.js`}
                        strategy="afterInteractive"
                        id="unifytag"
                        data-api-key={process.env.NEXT_PUBLIC_UNIFY_API_KEY}
                    />
                )}
            </head>
            <body className={fontClassName}>
                <GTProvider locale={locale as SupportedLocale}>
                    <TopNav locale={locale} />
                    <Toaster duration={2000} />
                    <AdToasts initialToasts={initialToasts} />
                    {children}
                    <Footer locale={locale} />
                </GTProvider>
            </body>
        </html>
    );
}
