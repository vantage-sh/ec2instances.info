export default function VantageDemo({ link }: { link: string }) {
    return (
        <div className="mb-4">
            <div className="flex w-full">
                <a href={link} target="_blank" className="mx-auto">
                    <img
                        src="/demo.png"
                        alt="Request a demo"
                        className="h-30"
                    />
                </a>
            </div>
        </div>
    );
}
