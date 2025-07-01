"use client";

import { translationToolDetected } from "@/state";
import Link from "next/link";
import { forwardRef } from "react";

export default forwardRef(function TranslationFriendlyLink(
    props: Omit<React.ComponentProps<typeof Link>, "ref" | "href"> & {
        href: string;
    },
    ref: React.Ref<HTMLAnchorElement>,
) {
    const usesTranslationTool = translationToolDetected.use();
    if (usesTranslationTool) {
        return <a ref={ref} {...props} />;
    }
    return <Link ref={ref} {...props} />;
});
