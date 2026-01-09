import { useMemo } from "react";
import { Server } from "lucide-react";
import TranslationFriendlyLink from "./TranslationFriendlyLink";

export default function InstanceVariants({
    bestOfVariants,
    pathPrefix,
    pathSuffix,
}: {
    bestOfVariants: { [key: string]: string };
    pathPrefix: string;
    pathSuffix: string;
}) {
    const keys = useMemo(
        () => Object.keys(bestOfVariants).sort((a, b) => a.localeCompare(b)),
        [bestOfVariants],
    );

    return (
        <section>
            <h3 className="flex items-center gap-2">
                <Server className="w-4 h-4 inline-block my-auto" /> Instance
                Variants
            </h3>
            <table className="mt-2 w-full text-sm">
                <thead>
                    <tr className="border-r border-gray-200 dark:border-gray-3">
                        <th className="text-left pb-1">Variant</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map((key) => (
                        <tr
                            key={key}
                            className="odd:bg-gray-100 dark:odd:bg-gray-4"
                        >
                            <td className="border border-gray-200 dark:border-gray-3 p-1">
                                <TranslationFriendlyLink
                                    className="text-purple-1 hover:text-purple-0 dark:text-purple-2 dark:hover:text-purple-0"
                                    href={`${pathPrefix}/${bestOfVariants[key]}${pathSuffix}`}
                                >
                                    {key}
                                </TranslationFriendlyLink>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
