import { readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";

const AWS_DOC_BASE = "https://docs.aws.amazon.com/ec2/latest/instancetypes";
const DOC_SLUGS = ["gp", "co", "mo", "so", "ac", "hpc"];
const INSTANCES_JSON = "www/instances.json";

function fatal(msg) {
    console.error(`FATAL: ${msg}`);
    process.exit(1);
}

async function fetchDoc(slug) {
    const url = `${AWS_DOC_BASE}/${slug}.md`;
    console.log(`Fetching ${url}`);
    const res = await fetch(url);
    if (!res.ok) fatal(`Fetch failed for ${url}: HTTP ${res.status}`);
    return { slug, text: await res.text() };
}

function parseIopsTable(markdown, slug) {
    const lines = markdown.split("\n");
    let inTable = false;
    let iopsColIdx = -1;
    let instanceColIdx = -1;
    const results = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("|")) {
            if (inTable) break;
            continue;
        }

        const cells = trimmed
            .split("|")
            .map((c) => c.trim())
            .filter((_, i, arr) => i > 0 && i < arr.length);

        if (!inTable) {
            const headerIdx = cells.findIndex((c) =>
                /random read IOPS/i.test(c),
            );
            if (headerIdx !== -1) {
                inTable = true;
                iopsColIdx = headerIdx;
                instanceColIdx = cells.findIndex((c) =>
                    /instance type/i.test(c),
                );
                if (instanceColIdx === -1) instanceColIdx = 0;
                continue;
            }
            continue;
        }

        // Skip separator row
        if (cells.every((c) => /^-+$/.test(c))) continue;

        // Skip family header rows (single non-empty cell)
        const nonEmpty = cells.filter((c) => c.length > 0);
        if (nonEmpty.length <= 1 && !/\.\w/.test(nonEmpty[0] || "")) continue;

        const instanceType = cells[instanceColIdx];
        if (!instanceType || !/\.\w/.test(instanceType)) continue;

        const iopsCell = cells[iopsColIdx] || "";
        if (!iopsCell.trim()) continue;

        const parts = iopsCell.split("/").map((p) => p.trim());
        if (parts.length !== 2) continue;

        const readIops = parseInt(parts[0].replace(/,/g, ""), 10);
        const writeIops = parseInt(parts[1].replace(/,/g, ""), 10);
        if (isNaN(readIops) || isNaN(writeIops)) continue;

        results[instanceType.toLowerCase()] = {
            read_iops: readIops,
            write_iops: writeIops,
        };
    }

    return results;
}

async function mergeIntoInstances(iopsMap) {
    let raw;
    try {
        raw = await readFile(INSTANCES_JSON, "utf-8");
    } catch (e) {
        fatal(`Cannot read ${INSTANCES_JSON}: ${e.message}`);
    }

    let instances;
    try {
        instances = JSON.parse(raw);
    } catch (e) {
        fatal(`Cannot parse ${INSTANCES_JSON}: ${e.message}`);
    }

    if (!Array.isArray(instances)) fatal(`${INSTANCES_JSON} is not an array`);

    let matched = 0;
    for (const inst of instances) {
        const key = inst.instance_type?.toLowerCase();
        if (!key) continue;
        const iops = iopsMap[key];
        if (iops && inst.storage) {
            inst.storage.storage_read_iops = iops.read_iops;
            inst.storage.storage_write_iops = iops.write_iops;
            matched++;
        }
    }

    if (matched === 0)
        fatal(
            `Zero instances matched IOPS data. IOPS entries: ${Object.keys(iopsMap).length}, instances with storage: ${instances.filter((i) => i.storage).length}`,
        );

    console.log(
        `Merged IOPS data into ${matched} instances (of ${Object.keys(iopsMap).length} IOPS entries)`,
    );

    await writeFile(INSTANCES_JSON, JSON.stringify(instances));
    return instances;
}

function sha256(text) {
    return createHash("sha256").update(text).digest("hex");
}

async function versionInR2(docs) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        console.log("R2 env vars not set, skipping versioning");
        return;
    }

    // Dynamic import so the script works without @aws-sdk locally
    const { S3Client, GetObjectCommand, PutObjectCommand } = await import(
        "@aws-sdk/client-s3"
    );

    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });

    // Fetch existing meta
    let meta = { hashes: {}, last_scrape: null };
    try {
        const res = await s3.send(
            new GetObjectCommand({ Bucket: bucketName, Key: "iops/meta.json" }),
        );
        meta = JSON.parse(await res.Body.transformToString());
    } catch (e) {
        if (e.name !== "NoSuchKey")
            console.warn("Could not read meta:", e.message);
    }

    const today = new Date().toISOString().slice(0, 10);
    let changed = false;

    for (const { slug, text } of docs) {
        const hash = sha256(text);
        if (meta.hashes[slug] !== hash) {
            changed = true;
            console.log(`${slug}.md changed, storing version for ${today}`);
            await s3.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: `iops/raw/${today}/${slug}.md`,
                    Body: text,
                    ContentType: "text/markdown",
                }),
            );
            meta.hashes[slug] = hash;
        }
    }

    meta.last_scrape = new Date().toISOString();

    if (changed) {
        // Build fresh parsed data from all docs
        const allIops = {};
        for (const { slug, text } of docs) {
            Object.assign(allIops, parseIopsTable(text, slug));
        }
        await s3.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: "iops/parsed/latest.json",
                Body: JSON.stringify(allIops, null, 2),
                ContentType: "application/json",
            }),
        );
    }

    await s3.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: "iops/meta.json",
            Body: JSON.stringify(meta, null, 2),
            ContentType: "application/json",
        }),
    );

    console.log(
        changed
            ? "R2 versioning updated"
            : "No doc changes detected, meta timestamp updated",
    );
}

async function main() {
    // 1. Fetch all docs in parallel
    const docs = await Promise.all(DOC_SLUGS.map(fetchDoc));

    // 2. Parse IOPS from each doc
    const allIops = {};
    let tablesFound = 0;
    for (const { slug, text } of docs) {
        const parsed = parseIopsTable(text, slug);
        const count = Object.keys(parsed).length;
        if (count > 0) tablesFound++;
        console.log(`${slug}.md: ${count} instance types with IOPS`);
        Object.assign(allIops, parsed);
    }

    const totalIops = Object.keys(allIops).length;
    console.log(`Total: ${totalIops} instance types with IOPS data`);
    if (totalIops === 0) fatal("Parsed zero IOPS entries across all docs");

    // Not all categories have instances with IOPS (e.g., hpc may have none).
    // But at least some must have the table.
    if (tablesFound === 0)
        fatal("No 'Instance store specifications' tables found in any doc");

    // 3. Merge into instances.json
    await mergeIntoInstances(allIops);

    // 4. Version in R2 (if configured)
    await versionInR2(docs);

    console.log("Done");
}

main().catch((e) => {
    fatal(`Unhandled error: ${e.message}`);
});
