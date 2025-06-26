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

const EC2FlexMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/m7i-flex-vs-t-series-cost?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=m7i-flex-t"
            image="https://assets.vantage.sh/blog/m7i-flex-vs-t-series-cost/m7i-flex-vs-t-series-cost.jpg"
            title="Evaluating M7-Flex Instances to Replace T Series"
            description="M7i-Flex instances offer superior performance and greater cost-effectiveness across various use cases"
        />
        <Item
            link="https://www.vantage.sh/blog/aws-ec2-processors-intel-vs-amd-vs-graviton-adoption?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=m7i-flex-t"
            image="https://assets.vantage.sh/blog/aws-ec2-processors-intel-vs-amd-vs-graviton-adoption/aws-ec2-processors-intel-vs-amd-vs-graviton-adoption.jpg"
            title="Intel vs AMD vs Graviton: Amazon EC2 Processor Differences and Distribution"
            description="As Graviton and AMD processors gain broader EC2 availability alongside Intel, we analyze factors such as performance, cost, and distribution."
        />
        <Item
            link="https://www.vantage.sh/blog/vantage-mcp?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=m7i-flex-t"
            image="https://assets.vantage.sh/blog/vantage-mcp/vantage-mcp.jpg"
            title="The Vantage MCP Server: Use AI to Analyze Your Cost and Usage Data"
            description="Ask questions about your organization's previous and current cloud cost spend, cost tagging, provider integrations, and more."
        />
    </ItemsWrapper>
);

const EC2GPUMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/vantage-mcp?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=gpu"
            image="https://assets.vantage.sh/blog/vantage-mcp/vantage-mcp.jpg"
            title="The Vantage MCP Server: Use AI to Analyze Your Cost and Usage Data"
            description="Ask questions about your organization's previous and current cloud cost spend, cost tagging, provider integrations, and more."
        />
        <Item
            link="https://www.vantage.sh/blog/aws-ec2-gpu-instances-g-family-vs-p-family-g4dn?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=gpu"
            image="https://assets.vantage.sh/blog/aws-ec2-gpu-instances-g-family-vs-p-family/aws-ec2-gpu-instances-g-family-vs-p-family.jpg"
            title="EC2 GPU Instances"
            description="EC2 GPU instances have been hugely popular due to advances in machine learning, gaming, etc. However, it can be difficult to know which to choose."
        />
        <Item
            link="https://www.vantage.sh/blog/aws-ec2-capacity-blocks-gpu-shortage-cost?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=gpu"
            image="https://assets.vantage.sh/blog/aws-ec2-capacity-blocks-gpu-shortage-cost/aws-ec2-capacity-blocks-gpu-shortage-cost-2.jpg"
            title="How AWS is Using Capacity Blocks to Alleviate the GPU Shortage"
            description="Capacity Blocks provide greater availability and cost savings for short-term GPU needs."
        />
    </ItemsWrapper>
);

const EC2OtherMarketing = () => (
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
        <Item
            link="https://www.vantage.sh/blog/vantage-launches-network-flow-reports?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=ec2"
            image="https://assets.vantage.sh/blog/vantage-launches-network-flow-reports/vantage-launches-network-flow-reports.jpg"
            title="Network Flow Reports: Increased Visibility into AWS Networking Costs"
            description="Visualize and measure the costs of individual flows within your network, grouped by source and destination at the network, interface, or AWS service level."
        />
    </ItemsWrapper>
);

const RDSMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/aws-rds-vs-aurora-pricing-in-depth?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=rds"
            image="https://assets.vantage.sh/blog/aws-rds-vs-aurora-pricing-in-depth/aws-rds-vs-aurora-pricing-in-depth.jpg"
            title="RDS vs Aurora: A Detailed Pricing Comparison"
            description="RDS and Aurora represent a significant potion of AWS spend, consistently ranking second on the AWS Cost Leaderboard."
        />
        <Item
            link="https://www.vantage.sh/blog/vantage-announces-general-availability-openai-cost-support?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=rds"
            image="https://assets.vantage.sh/blog/vantage-announces-general-availability-openai-cost-support/vantage-announces-general-availability-openai-cost-support.jpg"
            title="Vantage Launches General Availability of OpenAI Cost Support"
            description="Vantage users can now see their overall OpenAI costs alongside their other infrastructure providers."
        />
        <Item
            link="https://www.vantage.sh/blog/aws-graviton-vs-intel?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=rds"
            image="https://assets.vantage.sh/blog/aws-graviton-vs-intel/aws-graviton-vs-intel.jpg"
            title="The Rise of Graviton at AWS and How You Can Save by Switching"
            description="While Graviton processors are gaining significant adoption, some companies are still hesitant to make the switch. Switching to Graviton is a significant way to lower compute costs."
        />
    </ItemsWrapper>
);

const CacheMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/vantage-launches-autopilot-aws-savings-plans?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=elasticache"
            image="https://assets.vantage.sh/blog/vantage-launches-autopilot-aws-savings-plans/vantage-launches-autopilot-aws-savings-plans.jpg"
            title="Vantage Enables Autopilot Support for AWS Savings Plans"
            description="Autopilot for AWS Savings Plans now supports purchase recommendations and automatic purchases of AWS Compute Savings Plans."
        />
        <Item
            link="https://www.vantage.sh/blog/aws-lambda-avoid-infinite-loops?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=elasticache"
            image="https://assets.vantage.sh/blog/aws-lambda-avoid-infinite-loops/aws-lambda-avoid-infinite-loops.jpg"
            title="Recursive AWS Lambda Horror Stories and How to Avoid Them"
            description="Infinite recursion in Lambda can cause costs to spiral out of control. Following best practices can help you avoid getting caught up in your own Lambda horror story."
        />
        <Item
            link="https://www.vantage.sh/blog/vantage-launches-support-custom-providers-finops-focus?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=elasticache"
            image="https://assets.vantage.sh/blog/vantage-launches-support-custom-providers-finops-focus/vantage-launches-support-custom-providers-finops-focus.jpg"
            title="Vantage Launches Custom Providers with Support for the FinOps FOCUS Standard"
            description="Vantage now has support for integrating Custom Providers. Upload costs using the FinOps FOCUS specification to see costs for your entire tech stack on Vantage."
        />
    </ItemsWrapper>
);

const RedshiftMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/vantage-launches-support-custom-providers-finops-focus?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=redshift"
            image="https://assets.vantage.sh/blog/vantage-launches-support-custom-providers-finops-focus/vantage-launches-support-custom-providers-finops-focus.jpg"
            title="Vantage Launches Custom Providers with Support for the FinOps FOCUS Standard"
            description="Vantage now has support for integrating Custom Providers. Upload costs using the FinOps FOCUS specification to see costs for your entire tech stack on Vantage."
        />
        <Item
            link="https://www.vantage.sh/blog/how-to-save-on-aws-fargate-costs?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=redshift"
            image="https://assets.vantage.sh/blog/how-to-save-on-aws-fargate-costs/how-to-save-on-aws-fargate-costs.jpg"
            title="Optimize AWS Fargate Costs"
            description="You can easily overpay on Fargate without proper monitoring and resource allocation. Optimize your Fargate costs while maintaining performance and scalability."
        />
        <Item
            link="https://www.vantage.sh/blog/vantage-launches-autopilot-aws-savings-plans?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=redshift"
            image="https://assets.vantage.sh/blog/vantage-launches-autopilot-aws-savings-plans/vantage-launches-autopilot-aws-savings-plans.jpg"
            title="Vantage Enables Autopilot Support for AWS Savings Plans"
            description="Autopilot for AWS Savings Plans now supports purchase recommendations and automatic purchases of AWS Compute Savings Plans."
        />
    </ItemsWrapper>
);

const OpenSearchMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://www.vantage.sh/blog/vantage-launches-support-custom-providers-finops-focus?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=opensearch"
            image="https://assets.vantage.sh/blog/vantage-launches-support-custom-providers-finops-focus/vantage-launches-support-custom-providers-finops-focus.jpg"
            title="Vantage Launches Custom Providers with Support for the FinOps FOCUS Standard"
            description="Vantage now has support for integrating Custom Providers. Upload costs using the FinOps FOCUS specification to see costs for your entire tech stack on Vantage."
        />
        <Item
            link="https://www.vantage.sh/blog/how-to-save-on-aws-fargate-costs?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=opensearch"
            image="https://assets.vantage.sh/blog/how-to-save-on-aws-fargate-costs/how-to-save-on-aws-fargate-costs.jpg"
            title="Optimize AWS Fargate Costs"
            description="You can easily overpay on Fargate without proper monitoring and resource allocation. Optimize your Fargate costs while maintaining performance and scalability."
        />
        <Item
            link="https://www.vantage.sh/blog/vantage-links-datadog-costs-where-agent-installed?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=opensearch"
            image="https://assets.vantage.sh/blog/vantage-links-datadog-costs-where-agent-installed/vantage-links-datadog-costs-where-agent-installed.jpg"
            title="Vantage Now Links Datadog Costs to Where the Agent Is Installed"
            description="Vantage announces an enhancement to Datadog support, which gives customers the ability to see which hosts are driving respective Datadog costs, across AWS, Azure, and Google Cloud."
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
        <Item
            link="https://www.vantage.sh/blog/vantage-microsoft-teams?utm_campaign=Instances%20Blog%20Clicks&utm_source=instances&utm_content=azure"
            image="https://s3.amazonaws.com/assets.vantage.sh/www/vantage_msft_teams.png"
            title="Vantage Integrates with Microsoft Teams"
            description="Receive daily, weekly, or monthly reports of cloud costs directly to your organization’s Microsoft Teams public or private channels."
        />
    </ItemsWrapper>
);

type MarketingWrapperProps = {
    instanceType: string;
    children: React.ReactNode;
};

export default function MarketingWrapper({
    instanceType,
    children,
}: MarketingWrapperProps) {
    if (process.env.NEXT_PUBLIC_REMOVE_ADVERTS === "1") return children;

    let node: React.ReactNode;
    switch (instanceType) {
        case "azure":
            node = <AzureMarketing />;
            break;
        case "ec2-flex":
            node = <EC2FlexMarketing />;
            break;
        case "ec2-gpu":
            node = <EC2GPUMarketing />;
            break;
        case "ec2-other":
            node = <EC2OtherMarketing />;
            break;
        case "rds":
            node = <RDSMarketing />;
            break;
        case "opensearch":
            node = <OpenSearchMarketing />;
            break;
        case "redshift":
            node = <RedshiftMarketing />;
            break;
        case "elasticache":
            node = <CacheMarketing />;
            break;
        default:
            // This should fail the build
            throw new Error(`Unknown instance type: ${instanceType}`);
    }

    return (
        <div className="w-full">
            <div className="xl:flex gap-4 mx-auto w-max">
                <div className="flex-col">{children}</div>
                <div className="flex-col">{node}</div>
            </div>
        </div>
    );
}
