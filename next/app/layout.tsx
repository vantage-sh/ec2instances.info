import "./globals.css";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";
import Advert from "@/components/Advert";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
                <Advert />
                <Toaster duration={2000} />
                {children}
                <Footer />
            </body>
        </html>
    );
}
