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
                    href="https://vantage.sh/slack"
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
                        <g clipPath="url(#clip0_3_31)">
                            <path
                                d="M3.80157 11.379C3.80157 12.4251 2.95514 13.2707 1.90786 13.2707C0.860589 13.2707 0.0141602 12.4251 0.0141602 11.379C0.0141602 10.3328 0.860589 9.48724 1.90786 9.48724H3.80157V11.379ZM4.74842 11.379C4.74842 10.3328 5.59486 9.48724 6.64212 9.48724C7.6894 9.48724 8.53582 10.3328 8.53582 11.379V16.1083C8.53582 17.1545 7.6894 18 6.64212 18C5.59486 18 4.74842 17.1545 4.74842 16.1083V11.379Z"
                                fill="#E01E5A"
                            />
                            <path
                                d="M6.64231 3.78345C5.59503 3.78345 4.74861 2.9379 4.74861 1.89172C4.74861 0.845541 5.59503 0 6.64231 0C7.68959 0 8.53601 0.845541 8.53601 1.89172V3.78345H6.64231ZM6.64231 4.74363C7.68959 4.74363 8.53601 5.58917 8.53601 6.63535C8.53601 7.68153 7.68959 8.52708 6.64231 8.52708H1.8937C0.846428 8.52708 0 7.68153 0 6.63535C0 5.58917 0.846428 4.74363 1.8937 4.74363H6.64231Z"
                                fill="#36C5F0"
                            />
                            <path
                                d="M14.2313 6.63535C14.2313 5.58917 15.0778 4.74363 16.125 4.74363C17.1722 4.74363 18.0188 5.58917 18.0188 6.63535C18.0188 7.68153 17.1722 8.52708 16.125 8.52708H14.2313V6.63535ZM13.2845 6.63535C13.2845 7.68153 12.4381 8.52708 11.3908 8.52708C10.3435 8.52708 9.49707 7.68153 9.49707 6.63535V1.89172C9.49707 0.845541 10.3435 0 11.3908 0C12.4381 0 13.2845 0.845541 13.2845 1.89172V6.63535Z"
                                fill="#2EB67D"
                            />
                            <path
                                d="M11.3908 14.2165C12.4381 14.2165 13.2845 15.0621 13.2845 16.1083C13.2845 17.1545 12.4381 18 11.3908 18C10.3435 18 9.49707 17.1545 9.49707 16.1083V14.2165H11.3908ZM11.3908 13.2707C10.3435 13.2707 9.49707 12.4251 9.49707 11.379C9.49707 10.3328 10.3435 9.48724 11.3908 9.48724H16.1394C17.1866 9.48724 18.033 10.3328 18.033 11.379C18.033 12.4251 17.1866 13.2707 16.1394 13.2707H11.3908Z"
                                fill="#ECB22E"
                            />
                        </g>
                        <defs>
                            <clipPath id="clip0_3_31">
                                <rect width="18" height="18" fill="white" />
                            </clipPath>
                        </defs>
                    </svg>
                    Slack
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
