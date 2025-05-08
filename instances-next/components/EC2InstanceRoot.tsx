import { EC2Instance, Region } from "@/types";
import { useMemo } from "react";
import { Info, Server } from "lucide-react";
import Link from "next/link";
import { AllOfInstanceType, EC2FamilySizes } from "./EC2FamilySize";
import AWSPricingSelector from "@/components/EC2PricingCalculator";
import BGStyled from "@/components/BGStyled";
import * as tablesGenerator from "@/utils/ec2TablesGenerator";

interface InstanceRootProps {
    rainbowTable: string[];
    compressedInstance: EC2Instance;
    description: string;
    bestOfVariants: {
        [key: string]: string;
    };
    allOfInstanceType: AllOfInstanceType;
    regions: Region;
    osOptions: [string, string][];
    defaultOs: string;
    generatorKey: keyof typeof tablesGenerator;
    pathPrefix: string;
    lessPricingFlexibility: boolean;
    tablePath: string;
}

function InstanceVariants({ bestOfVariants, pathPrefix }: { bestOfVariants: { [key: string]: string }; pathPrefix: string }) {
    const keys = useMemo(() => Object.keys(bestOfVariants).sort(
        (a, b) => a.localeCompare(b),
    ), [bestOfVariants]);

    return (
        <section>
            <h3 className="flex items-center gap-2"><Server className="w-4 h-4 inline-block my-auto" /> Instance Variants</h3>
            <table className="mt-2 w-full text-sm">
                <thead>
                    <tr className="border-r border-gray-200">
                        <th className="text-left pb-1">Variant</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map((key) => (
                        <tr key={key} className="odd:bg-gray-100">
                            <td className="border border-gray-200 p-1">
                                <Link className="text-purple-1 hover:text-purple-0" href={`${pathPrefix}/${bestOfVariants[key]}`}>{key}</Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}


type TableProps = {
    slug: string;
    name: string;
    children: React.ReactNode;
}

function Table({ slug, name, children }: TableProps) {
    return (
        <table id={slug} className="mt-4 w-full text-sm p-2 border-collapse border border-gray-200 rounded-md">
            <thead>
                <tr className="bg-gray-100">
                    <th className="text-left p-1 border-gray-200">
                        <a href={`#${slug}`} className="text-purple-1 hover:text-purple-0">{name}</a>
                    </th>
                    <th className="text-left p-1 border-l border-gray-200">
                        Value
                    </th>
                </tr>
            </thead>
            <tbody>
                {children}
            </tbody>
        </table>
    );
}

type RowProps = {
    name: string;
    children: React.ReactNode;
    help?: string;
    helpText?: string;
}

function Row({ name, children, help, helpText }: RowProps) {
    return (
        <tr>
            <td className="p-1 border border-gray-200">{name}{help && (
                <span>{" "}<a target="_blank" href={help} className="text-purple-1 hover:text-purple-0">({helpText || "?"})</a></span>
            )}</td>
            <td className="p-1 border border-gray-200">{children}</td>
        </tr>
    );
}

function InstanceDataView({ instance, generatorKey }: { instance: Omit<EC2Instance, "pricing">; generatorKey: keyof typeof tablesGenerator }) {
    return (
        <article>
            <h2 className="font-bold flex items-center gap-2"><Info className="w-4 h-4" />Instance Details</h2>

            {
                tablesGenerator[generatorKey](instance).map((table) => (
                    <Table key={table.slug} slug={table.slug} name={table.name}>
                        {
                            table.rows.map((row) => (
                                <Row key={row.name} name={row.name} help={row.help} helpText={row.helpText}>
                                    {row.bgStyled ? <BGStyled content={row.children} /> : row.children}
                                </Row>
                            ))
                        }
                    </Table>
                ))
            }
        </article>
    );
}

export default function EC2InstanceRoot({ rainbowTable, compressedInstance, description, bestOfVariants, allOfInstanceType, regions, osOptions, defaultOs, generatorKey, pathPrefix, lessPricingFlexibility, tablePath }: InstanceRootProps) {
    return (
        <main className="md:flex my-4 px-4 max-w-screen-lg mx-auto gap-8">
            <div className="md:max-w-sm">
                <h1 className="text-2xl font-bold mb-2">{compressedInstance.instance_type}</h1>
                <p className="text-sm mb-4">{description}</p>
                <AWSPricingSelector rainbowTable={rainbowTable} compressedInstance={compressedInstance} regions={regions} osOptions={osOptions} defaultOs={defaultOs} lessPricingFlexibility={lessPricingFlexibility} />
                <EC2FamilySizes allOfInstanceType={allOfInstanceType} instanceName={compressedInstance.instance_type} pathPrefix={pathPrefix} tablePath={tablePath} />
                <InstanceVariants bestOfVariants={bestOfVariants} pathPrefix={pathPrefix} />
                <p className="mt-6">
                    Having trouble making sense of your EC2 costs? Check out <a target="_blank" className="text-purple-1 hover:text-purple-0 underline" href="https://cur.vantage.sh">
                        cur.vantage.sh
                    </a> for an AWS billing code lookup tool.
                </p>
            </div>
            <div className="flex-grow md:mt-0 mt-4">
                <InstanceDataView instance={compressedInstance} generatorKey={generatorKey} />
            </div>
        </main>
    );
}
