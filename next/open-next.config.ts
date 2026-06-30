import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// ISR cache lives in R2 (binding NEXT_INC_CACHE_R2_BUCKET); time-based
// revalidations are dispatched through a Durable-Object queue
// (binding NEXT_CACHE_DO_QUEUE, class DOQueueHandler). The app uses neither
// revalidateTag nor revalidatePath, so no tag cache is configured.
export default defineCloudflareConfig({
    incrementalCache: r2IncrementalCache,
    queue: doQueue,
});
