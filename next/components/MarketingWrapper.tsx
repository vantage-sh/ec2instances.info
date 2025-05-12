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
        <div className="xl:mt-4 flex-col border border-gray-200 rounded-md p-4 w-2xs">
            <img
                src={image}
                alt={title}
                className="w-full h-40 object-cover rounded-md"
            />
            <h3 className="text-lg font-bold mt-2" aria-hidden="true">
                {title}
            </h3>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
    </a>
);

const AWSMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://aws.amazon.com/ec2/"
            image="/demo.png"
            title="Hello World!"
            description="item 1"
        />
        <Item
            link="https://aws.amazon.com/ec2/"
            image="/demo.png"
            title="Hello World!"
            description="item 2"
        />
    </ItemsWrapper>
);

const AzureMarketing = () => (
    <ItemsWrapper>
        <Item
            link="https://aws.amazon.com/ec2/"
            image="/demo.png"
            title="Azure Hello World!"
            description="item 1"
        />
        <Item
            link="https://aws.amazon.com/ec2/"
            image="/demo.png"
            title="Azure Hello World!"
            description="item 2"
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
