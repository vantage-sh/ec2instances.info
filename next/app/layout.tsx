import "./globals.css";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";

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
            </head>
            <body className={inter.className}>
                <TopNav />
                {children}
            </body>
        </html>
    );
}
