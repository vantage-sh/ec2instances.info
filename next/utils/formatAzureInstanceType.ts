export default function formatAzureInstanceType<
    Instance extends {
        instance_type: string;
    },
>(instance: Instance) {
    if (instance.instance_type.slice(0, 2) !== "nv") {
        instance.instance_type = instance.instance_type.replace("v", "-v");
    } else {
        instance.instance_type = instance.instance_type.replace("sv", "s-v");
    }
}
