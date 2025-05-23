import "./globals.css";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";

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
                <GoogleTagManager gtmId="GTM-TBZCV32" />
                <Script src="https://vantage-api.com/i.js" />
            </head>
            <body className={inter.className}>
                <TopNav />
                <Toaster duration={2000} />
                {children}
                <Footer />
            </body>
        </html>
    );
}
