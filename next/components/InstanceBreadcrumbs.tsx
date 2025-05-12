"use client";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

export default function InstanceBreadcrumbs({
    crumbs,
}: {
    crumbs: { name: string; href: string }[];
}) {
    return (
        <Breadcrumb className="my-3">
            <BreadcrumbList>
                {crumbs.map((crumb, index) => {
                    return (
                        <React.Fragment key={index}>
                            <BreadcrumbItem>
                                {index === crumbs.length - 1 ? (
                                    <BreadcrumbPage>
                                        {crumb.name}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={crumb.href}>
                                        {crumb.name}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {index < crumbs.length - 1 && (
                                <BreadcrumbSeparator />
                            )}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
