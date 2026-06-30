const LOW_MEDIUM_HIGH = /(low|moderate|high)/gi;

export type DescriptionTranslator = (
    key: string,
    vars?: Record<string, any>,
) => string;

interface DescribableInstance {
    instance_type: string;
    family: string;
    vCPU: number;
    memory: number;
    network_performance: string;
}

/**
 * Builds the instance description from the shared translation template
 * (`instancePage.description` plus its bandwidth fragments). The translation
 * function is injected so this works both with gt-next's `t()` on rendered
 * pages and with a dictionary-backed translator in non-request contexts (e.g.
 * the llms build script). This is the single source of truth for the
 * description copy; the wording lives only in the translation files.
 */
export default function buildInstanceDescription(
    t: DescriptionTranslator,
    instance: DescribableInstance,
    ondemandCost: string,
): string {
    let bandwidth = "";
    if (instance.network_performance) {
        if (instance.network_performance.match(LOW_MEDIUM_HIGH)) {
            bandwidth = t("instancePage.bandwidthPerformance", {
                performance: instance.network_performance.toLowerCase(),
            });
        } else {
            bandwidth = t("instancePage.bandwidthGibps", {
                bandwidth: instance.network_performance
                    .toLowerCase()
                    .replace("gigabit", "")
                    .trim(),
            });
        }
    }
    return t("instancePage.description", {
        instanceType: instance.instance_type,
        family: instance.family,
        vCPUs: instance.vCPU,
        memory: instance.memory,
        bandwidth,
        cost: `$${ondemandCost}`,
    });
}
