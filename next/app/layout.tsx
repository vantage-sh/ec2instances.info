import "./globals.css";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import AdToasts from "@/components/AdToasts";
import { Toaster } from "@/components/ui/sonner";
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";
import { array, object, string, parse } from "valibot";

// Not ideal, but copied because its like 6 lines long and didn't feel worth a whole file
const toastsSchema = array(
    object({
        campaign_id: string(),
        message: string(),
        url: string(),
    }),
);

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
        <html lang="en">
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
            <body className={inter.className}>
                <TopNav />
                <Toaster theme="light" duration={2000} />
                <AdToasts initialToasts={initialToasts} />
                {children}
                <Footer />
            </body>
        </html>
    );
}
