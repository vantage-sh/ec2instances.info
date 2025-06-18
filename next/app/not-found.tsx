export default function Page404() {
    const full =
        process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1"
            ? "h-[calc(100vh-6em)]"
            : "h-[calc(100vh-8.5em)]";

    return (
        <main
            className={`flex flex-col items-center justify-center ${full} mx-4`}
        >
            <h1 className="text-2xl font-bold mb-2">Page not found</h1>
            <p>
                The page you are looking for does not exist. Is this unexpected?
                If so,{" "}
                <a
                    className="text-purple-1 hover:text-purple-0"
                    href="https://vantage.sh/slack"
                    target="_blank"
                >
                    please let us know.
                </a>
            </p>
        </main>
    );
}
