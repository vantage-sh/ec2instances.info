"use client";

import TranslationFriendlyLink from "@/components/TranslationFriendlyLink";
import { buttonVariants } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { translationToolDetected } from "@/state";

const navItems = [
    {
        label: "AWS",
        href: "/",
        children: [
            {
                label: "EC2",
                href: "/",
            },
            {
                label: "RDS",
                href: "/rds",
            },
            {
                label: "ElastiCache",
                href: "/cache",
            },
            {
                label: "Redshift",
                href: "/redshift",
            },
            {
                label: "OpenSearch",
                href: "/opensearch",
            },
        ],
    },
    {
        label: "Azure",
        href: "/azure",
        children: [
            {
                label: "VM",
                href: "/azure",
            },
        ],
    },
];

function TranslationToolDetector({
    className,
    text,
}: {
    className: string;
    text: string;
}) {
    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const span = spanRef.current;
        if (!span) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const textContent = mutation.target.textContent;
                if (textContent !== text) {
                    translationToolDetected.set(true);
                    observer.disconnect();
                }
            });
        });
        observer.observe(span, { childList: true });
        return () => observer.disconnect();
    }, [text, spanRef.current, translationToolDetected]);

    return (
        <span ref={spanRef} className={className}>
            {text}
        </span>
    );
}

export default function TopNav() {
    const currentPath = usePathname();

    return (
        <nav className="flex items-center justify-between bg-purple-brand h-[3rem] py-2 px-4">
            <div className="flex items-center justify-start gap-4">
                <TranslationFriendlyLink
                    href="/"
                    className="font-medium text-gray-6"
                >
                    <div className="flex items-center justify-start gap-2">
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 28 28"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M14 5.30693e-07C11.2311 5.30693e-07 8.52431 0.821087 6.22202 2.35943C3.91973 3.89776 2.12532 6.08427 1.06569 8.64243C0.00606512 11.2006 -0.27118 14.0155 0.269013 16.7313C0.809206 19.447 2.14258 21.9416 4.10052 23.8995C6.05845 25.8574 8.55299 27.1908 11.2687 27.731C13.9845 28.2712 16.7994 27.9939 19.3576 26.9343C21.9157 25.8747 24.1022 24.0803 25.6406 21.778C27.1789 19.4757 28 16.7689 28 14C28.0005 12.1614 27.6387 10.3406 26.9354 8.64183C26.232 6.94305 25.2007 5.39949 23.9006 4.09937C22.6005 2.79925 21.057 1.76804 19.3582 1.06466C17.6594 0.361272 15.8386 -0.000505775 14 5.30693e-07Z"
                                fill="#00000066"
                            />
                            <path
                                d="M3.93453 12.1002L8.13493 16.3045C8.17662 16.3477 8.22659 16.3821 8.28188 16.4056C8.33717 16.4291 8.39661 16.4412 8.45668 16.4412C8.51675 16.4412 8.57622 16.4291 8.63151 16.4056C8.68679 16.3821 8.73677 16.3477 8.77846 16.3045L12.9711 12.1002C13.0549 12.0164 13.102 11.9027 13.102 11.7842C13.102 11.6657 13.0549 11.5521 12.9711 11.4682L8.76689 7.26786C8.68307 7.18408 8.56943 7.13702 8.45092 7.13702C8.33241 7.13702 8.21875 7.18408 8.13493 7.26786L3.93453 11.4682C3.85076 11.5521 3.80371 11.6657 3.80371 11.7842C3.80371 11.9027 3.85076 12.0164 3.93453 12.1002Z"
                                fill="white"
                            />
                            <path
                                d="M14.316 21.8497L18.5164 17.6494C18.6002 17.5655 18.6473 17.4519 18.6473 17.3334C18.6473 17.2148 18.6002 17.1012 18.5164 17.0174L14.316 12.8131C14.2322 12.7294 14.1185 12.6823 14 12.6823C13.8815 12.6823 13.7679 12.7294 13.684 12.8131L9.47982 17.0174C9.39604 17.1012 9.34897 17.2148 9.34897 17.3334C9.34897 17.4519 9.39604 17.5655 9.47982 17.6494L13.684 21.8497C13.7679 21.9335 13.8815 21.9806 14 21.9806C14.1185 21.9806 14.2322 21.9335 14.316 21.8497Z"
                                fill="white"
                            />
                            <path
                                d="M19.8613 16.3045L24.0617 12.1002C24.1036 12.059 24.137 12.0098 24.1597 11.9555C24.1824 11.9013 24.1942 11.8431 24.1942 11.7842C24.1942 11.7254 24.1824 11.6672 24.1597 11.6129C24.137 11.5587 24.1036 11.5095 24.0617 11.4682L19.8613 7.26786C19.7775 7.18408 19.6638 7.13702 19.5453 7.13702C19.4268 7.13702 19.3132 7.18408 19.2293 7.26786L15.0251 11.4682C14.9413 11.5521 14.8943 11.6657 14.8943 11.7842C14.8943 11.9027 14.9413 12.0164 15.0251 12.1002L19.2293 16.3045C19.3132 16.3882 19.4268 16.4353 19.5453 16.4353C19.6638 16.4353 19.7775 16.3882 19.8613 16.3045Z"
                                fill="white"
                            />
                        </svg>
                        <div className="flex flex-col">
                            <span className="font-semibold text-white leading-5">
                                Instances
                            </span>
                            <TranslationToolDetector
                                className="text-xs italic text-gray-5"
                                text="Presented by Vantage"
                            />
                        </div>
                    </div>
                </TranslationFriendlyLink>
                {navItems.map((item) => (
                    <div
                        className="flex items-center justify-start gap-4 relative top-1.5 ml-2"
                        key={item.label}
                    >
                        <TranslationFriendlyLink
                            className="font-medium text-gray-6 text-sm"
                            href={item.href}
                        >
                            {item.label}
                        </TranslationFriendlyLink>
                        <div className="flex items-center justify-start gap-4 rounded-md rounded-b-none bg-black/30 not-lg:hidden p-1 pb-0">
                            {item.children &&
                                item.children.map((child) => {
                                    const selected =
                                        currentPath === child.href ||
                                        currentPath.includes(
                                            child.label.toLowerCase(),
                                        );
                                    return (
                                        <TranslationFriendlyLink
                                            aria-current={selected}
                                            className={`font-normal text-sm px-2 py-1 pb-2 rounded rounded-b-none ${
                                                selected
                                                    ? "bg-white text-black font-semibold"
                                                    : "text-gray-6"
                                            }`}
                                            key={child.label}
                                            href={child.href}
                                        >
                                            {child.label}
                                        </TranslationFriendlyLink>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-end gap-4 not-md:hidden overflow-hidden">
                <TranslationFriendlyLink
                    href="https://newsletters.vantage.sh"
                    target="_blank"
                    className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                    })}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                    </svg>
                    Get Notified
                </TranslationFriendlyLink>
                <TranslationFriendlyLink
                    href="https://github.com/vantage-sh/ec2instances.info"
                    className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                    })}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <g clipPath="url(#clip0_3_29)">
                            <path
                                d="M9 0C13.9725 0 18 4.0275 18 9C17.9995 10.8857 17.4077 12.7238 16.3078 14.2556C15.2079 15.7873 13.6554 16.9356 11.8688 17.5387C11.4188 17.6287 11.25 17.3475 11.25 17.1112C11.25 16.8075 11.2613 15.84 11.2613 14.6363C11.2613 13.7925 10.98 13.2525 10.6538 12.9712C12.6563 12.7463 14.76 11.9812 14.76 8.5275C14.76 7.5375 14.4113 6.73875 13.8375 6.10875C13.9275 5.88375 14.2425 4.96125 13.7475 3.72375C13.7475 3.72375 12.9938 3.47625 11.2725 4.64625C10.5525 4.44375 9.7875 4.3425 9.0225 4.3425C8.2575 4.3425 7.4925 4.44375 6.7725 4.64625C5.05125 3.4875 4.2975 3.72375 4.2975 3.72375C3.8025 4.96125 4.1175 5.88375 4.2075 6.10875C3.63375 6.73875 3.285 7.54875 3.285 8.5275C3.285 11.97 5.3775 12.7463 7.38 12.9712C7.12125 13.1962 6.885 13.59 6.80625 14.175C6.28875 14.4113 4.995 14.7937 4.185 13.4325C4.01625 13.1625 3.51 12.4987 2.80125 12.51C2.0475 12.5212 2.4975 12.9375 2.8125 13.1062C3.195 13.32 3.63375 14.1187 3.735 14.3775C3.915 14.8837 4.5 15.8513 6.76125 15.435C6.76125 16.1888 6.7725 16.8975 6.7725 17.1112C6.7725 17.3475 6.60375 17.6175 6.15375 17.5387C4.36122 16.9421 2.80208 15.7961 1.6975 14.2635C0.592928 12.7308 -0.000990539 10.8892 1.2401e-06 9C1.2401e-06 4.0275 4.0275 0 9 0Z"
                                fill="black"
                            />
                        </g>
                        <defs>
                            <clipPath id="clip0_3_29">
                                <rect width="18" height="18" fill="white" />
                            </clipPath>
                        </defs>
                    </svg>
                    Star
                </TranslationFriendlyLink>
            </div>
        </nav>
    );
}
