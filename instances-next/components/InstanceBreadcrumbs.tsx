"use client";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation";
import React from "react";

export default function InstanceBreadcrumbs() {
    const pathname = usePathname();
    const pathParts = pathname.split("/").filter(Boolean);
    
    return (
        <Breadcrumb className="my-3">
            <BreadcrumbList>
                {pathParts.map((part, index) => {
                    const href = part === 'aws' || part === 'ec2' ? '/' : `/${part}`;
                    const displayName = part
                        .replace('aws', 'AWS')
                        .replace('ec2', 'EC2')
                        .replace('rds', 'RDS');
                    
                    return (
                        <React.Fragment key={index}>
                            <BreadcrumbItem>
                                {index === pathParts.length - 1 ? (
                                    <BreadcrumbPage>{displayName}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={href}>{displayName}</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {index < pathParts.length - 1 && <BreadcrumbSeparator />}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
