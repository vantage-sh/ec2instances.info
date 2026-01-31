"use client";

import { Info } from "lucide-react";
import BGStyled from "./BGStyled";
import type { Table as TableType } from "@/utils/ec2TablesGenerator";
import { useTranslations } from "gt-next";

type TableProps = {
    slug: string;
    name: string;
    children: React.ReactNode;
};

function Table({ slug, name, children, valueLabel }: TableProps & { valueLabel: string }) {
    return (
        <table
            id={slug}
            className="mt-4 w-full text-sm p-2 border-collapse border border-gray-200 dark:border-gray-3 rounded-md"
        >
            <thead>
                <tr className="bg-gray-100 dark:bg-gray-4">
                    <th className="text-left p-1 border-gray-200 dark:border-gray-3">
                        <a
                            href={`#${slug}`}
                            className="text-purple-1 hover:text-purple-0 dark:text-purple-2 dark:hover:text-purple-0"
                        >
                            {name}
                        </a>
                    </th>
                    <th className="text-left p-1 border-l border-gray-200 dark:border-gray-3">
                        {valueLabel}
                    </th>
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    );
}

type RowProps = {
    name: string;
    children: React.ReactNode;
    help?: string;
    helpText?: string;
};

function Row({ name, children, help, helpText }: RowProps) {
    return (
        <tr>
            <td className="py-1.5 px-3 border border-gray-200 dark:border-gray-3 w-1/2">
                {name}
                {help && (
                    <span>
                        {" "}
                        <a
                            target="_blank"
                            href={help}
                            className="text-purple-1 hover:text-purple-0 before:content-['('] after:content-[')']"
                        >
                            {helpText || "?"}
                        </a>
                    </span>
                )}
            </td>
            <td className="py-1.5 px-3 border border-gray-200 dark:border-gray-3 w-1/2">
                {children}
            </td>
        </tr>
    );
}

export default function InstanceDataView({ tables }: { tables: TableType[] }) {
    const t = useTranslations();
    return (
        <article>
            <h2 className="font-bold flex items-center gap-2">
                <Info className="w-4 h-4" />
                {t("instancePage.instanceDetails")}
            </h2>

            {tables.map((table) => (
                <Table
                    key={table.slug}
                    slug={table.slug}
                    name={t(`instancePage.tables.${table.nameKey}`)}
                    valueLabel={t("instancePage.value")}
                >
                    {table.rows.map((row) => (
                        <Row
                            key={row.nameKey}
                            name={t(`instancePage.tables.${row.nameKey}`)}
                            help={row.help}
                            helpText={row.helpText}
                        >
                            {row.bgStyled ? (
                                <BGStyled content={row.children} />
                            ) : (
                                row.children
                            )}
                        </Row>
                    ))}
                </Table>
            ))}
        </article>
    );
}
