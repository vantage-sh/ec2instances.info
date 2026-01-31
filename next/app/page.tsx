import { DEFAULT_LOCALE } from "@/utils/fonts";

export default function RootPage() {
    return (
        <html lang="en">
            <head>
                <meta
                    httpEquiv="refresh"
                    content={`0;url=/${DEFAULT_LOCALE}/`}
                />
                <link rel="canonical" href={`/${DEFAULT_LOCALE}/`} />
                <title>Redirecting...</title>
            </head>
            <body>
                <p>
                    Redirecting to <a href={`/${DEFAULT_LOCALE}/`}>/{DEFAULT_LOCALE}/</a>
                </p>
            </body>
        </html>
    );
}
