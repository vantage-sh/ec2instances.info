const ItemsWrapper = ({ children }: { children: React.ReactNode }) => (
    <section className="not-xl:flex not-xl:flex-wrap not-xl:w-screen gap-4 mt-4">
        {children}
    </section>
);

type ItemProps = {
    link: string;
    image: string;
    title: string;
    description: string;
};

const Item = ({ link, image, title, description }: ItemProps) => (
    <a href={link} target="_blank" className="not-sm:mx-auto">
        <div className="xl:mt-4 flex-col border border-gray-200 rounded-md p-4 w-xs xl:w-3xs 2xl:w-xs">
            <img
                src={image}
                alt={title}
                className="w-full h-40 object-cover rounded-md"
            />
            <h3
                className="text-md not-xl:text-sm xl:text-xs 2xl:text-sm font-semibold mt-2 leading-tight mb-1"
                aria-hidden="true"
            >
                {title}
            </h3>
            <p className="text-xs not-xl:text-2xs xl:text-3xs 2xl:text-2xs text-gray-500">
                {description}
            </p>
        </div>
    </a>
);

const AWSMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/vantage-mcp?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=ec2"
            image="https://assets.vantage.sh/blog/vantage-mcp/vantage-mcp.jpg"
            title="The Vantage MCP Server: Use AI to Analyze Your Cost and Usage Data"
            description="Ask questions about your organization's previous and current cloud cost spend, cost tagging, provider integrations, and more."
        />
        <Item
            link="https://www.vantage.sh/blog/aws-ec2-processors-intel-vs-amd-vs-graviton-adoption?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances"
            image="https://assets.vantage.sh/blog/aws-ec2-processors-intel-vs-amd-vs-graviton-adoption/aws-ec2-processors-intel-vs-amd-vs-graviton-adoption.jpg"
            title="Intel vs AMD vs Graviton: Amazon EC2 Processor Differences and Distribution"
            description="As Graviton and AMD processors gain broader EC2 availability alongside Intel, we analyze factors such as performance, cost, and distribution."
        />
    </ItemsWrapper>
);

const AzureMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/how-to-save-on-azure-virtual-machine-costs?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=azure"
            image="https://assets.vantage.sh/blog/how-to-save-on-azure-virtual-machine-costs/how-to-save-on-azure-virtual-machine-costs.jpg"
            title="How to Save on Azure Virtual Machines"
            description="Data shows Azure Virtual Machine users are not fully leveraging available cost optimization strategies. This guide goes over high-level strategies to save on VM costs."
        />
        <Item
            link="https://www.vantage.sh/blog/vantage-launches-additional-azure-cost-recommendations?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=azure"
            image="https://assets.vantage.sh/blog/vantage-launches-additional-azure-cost-recommendations/vantage-launches-additional-azure-cost-recommendations.jpg"
            title="Azure Cost Recommendations"
            description="Vantage launches support for additional Azure cost recommendations for services like Blob Storage Reserved Instances and Virtual Machine Rightsizing."
        />
    </ItemsWrapper>
);

type MarketingWrapperProps = {
    azure: boolean;
    children: React.ReactNode;
};

export default function MarketingWrapper({
    azure,
    children,
}: MarketingWrapperProps) {
    if (process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1") return children;

    return (
        <div className="w-full">
            <div className="xl:flex gap-4 mx-auto w-max">
                <div className="flex-col">{children}</div>
                <div className="flex-col">
                    {azure ? <AzureMarketing /> : <AWSMarketing />}
                </div>
            </div>
        </div>
    );
}
