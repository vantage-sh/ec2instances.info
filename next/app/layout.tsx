import "./globals.css";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import AdToasts from "@/components/AdToasts";
import { Toaster } from "@/components/ui/sonner";
import { GoogleTagManager } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
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
            </head>
            <body className={inter.className}>
                <TopNav />
                <Toaster duration={2000} />
                <AdToasts />
                {children}
                <Footer />
            </body>
        </html>
    );
}
