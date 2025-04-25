
export default function Loading() {
    return (
        <main className="h-screen flex flex-col">
            <div className="flex-1 flex items-center justify-center">
                <div className="block text-center">
                    <div
                        className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite]"
                        role="status"
                    >
                        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                            Loading...
                        </span>
                    </div>
                    <div className="text-2xl font-bold mt-2">Loading table data...</div>
                    <div className="text-sm text-gray-500">
                        This may take a few seconds.
                    </div>
                </div>
            </div>
        </main>
    );
}
