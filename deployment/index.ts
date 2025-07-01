import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    GetObjectCommandOutput,
    NoSuchKey,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { join } from "path";
import fs from "fs/promises";
import mime from "mime";
import crypto from "crypto";

function requiresEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}

const bucket = requiresEnv("DEPLOYMENT_CF_BUCKET");
const accountId = requiresEnv("DEPLOYMENT_CF_ACCOUNT_ID");
const accessKeyId = requiresEnv("DEPLOYMENT_CF_AWS_ACCESS_KEY_ID");
const secretAccessKey = requiresEnv("DEPLOYMENT_CF_AWS_SECRET_ACCESS_KEY");
const apiKey = requiresEnv("DEPLOYMENT_CF_API_KEY");
const namespace = requiresEnv("DEPLOYMENT_CF_NAMESPACE");

let pendingKvWriteRequests: string[] = [];
let writeTickPromise: Promise<void> | null = null;

const NINETY_MEGS = 90 * 1024 * 1024;

async function writeTick() {
    // This tick is ready to run. Let others make a new one.
    writeTickPromise = null;

    // Grab the current items so another tick can run.
    const items = pendingKvWriteRequests;
    pendingKvWriteRequests = [];

    // We need to make batches that are:
    // 1. Less than 90MB
    // 2. Less than 10k items
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentBatchSize = 0;
    for (const item of items) {
        if (
            currentBatchSize + item.length > NINETY_MEGS ||
            currentBatch.length >= 9999
        ) {
            batches.push(currentBatch);
            currentBatch = [];
            currentBatchSize = 0;
        }
        currentBatch.push(item);
        currentBatchSize += item.length;
    }
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    // Make the requests.
    for (const batch of batches) {
        const json = `[${batch.join(",")}]`;
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespace}/bulk`;
        const response = await fetch(url, {
            method: "POST",
            body: json,
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(
                `Failed to write to KV: ${response.status} ${response.statusText} (${await response.text()})`,
            );
        }
    }
}

async function kvPut(
    key: string,
    value: Buffer,
    contentType: string | undefined,
) {
    // Create the item to batch.
    const b64 = value.toString("base64");
    const item = JSON.stringify({
        base64: true,
        key,
        value: b64,
        metadata: contentType ? { "Content-Type": contentType } : {},
    });
    pendingKvWriteRequests.push(item);

    // Wait for the tick to run and make it if it doesn't exist.
    if (!writeTickPromise) {
        writeTickPromise = (async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            await writeTick();
        })();
    }
    await writeTickPromise;
}

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

const wwwFolder = join(__dirname, "..", "www");

function contentTypeHandler(filePath: string) {
    if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
    if (filePath.endsWith(".map")) return "application/json";
    return mime.getType(filePath) ?? undefined;
}

let fileHashes: { [key: string]: string } = {};
const writtenKeys = new Set<string>();

async function tryOp10Times(fn: () => Promise<void>) {
    for (let i = 0; i < 9; i++) {
        try {
            await fn();
            return;
        } catch {
            // Sleep for 1 second.
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    await fn();
}

const TEN_MB = 10 * 1024 * 1024;

async function uploadFile(key: string, filePath: string) {
    // This is before the hash check so we don't destroy the file if its been written in the past.
    writtenKeys.add(key);

    const file = await fs.readFile(filePath);
    const hash = crypto.createHash("sha256").update(file).digest("hex");
    if (fileHashes[key] === hash) {
        return;
    }
    fileHashes[key] = hash;

    const ContentType = contentTypeHandler(filePath);

    if (file.length > TEN_MB) {
        // Upload to R2.
        await tryOp10Times(async () => {
            await s3Client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: file,
                    ContentType,
                }),
            );
        });
    } else {
        // Upload to Workers KV.
        await tryOp10Times(async () => {
            await kvPut(key, file, ContentType);
        });
    }
}

let keysToDelete: string[] = [];
let keysToDeleteTickPromise: Promise<void> | null = null;

async function kvDeleteTick() {
    const items = keysToDelete;
    keysToDelete = [];

    // Make batches of 1000 items.
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    for (const item of items) {
        if (currentBatch.length >= 999) {
            batches.push(currentBatch);
            currentBatch = [];
        }
        currentBatch.push(item);
    }
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    // Make the requests.
    for (const batch of batches) {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespace}/bulk`;
        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(batch),
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(
                `Failed to delete from KV: ${response.status} ${response.statusText} (${await response.text()})`,
            );
        }
    }
}

async function kvDelete(key: string) {
    keysToDelete.push(key);
    if (!keysToDeleteTickPromise) {
        keysToDeleteTickPromise = (async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            await kvDeleteTick();
        })();
    }
    await keysToDeleteTickPromise;
}

async function uploadFolder(extras: string[]) {
    const totalFp = join(wwwFolder, ...extras);
    const files = await fs.readdir(totalFp);
    const promises: Promise<void>[] = [];
    for (const file of files) {
        const filePath = join(totalFp, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            promises.push(uploadFolder([...extras, file]));
        } else {
            const filename =
                extras.length === 0 && file === "index.html"
                    ? "index.html"
                    : file.replace(".html", "");
            promises.push(
                uploadFile([...extras, filename].join("/"), filePath),
            );
        }
    }
    await Promise.all(promises);
}

(async () => {
    // Read file_hashes.json from the bucket.
    let fileHashesResponse: GetObjectCommandOutput;
    try {
        fileHashesResponse = await s3Client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: "file_hashes.json",
            }),
        );
        if (fileHashesResponse.Body)
            fileHashes = JSON.parse(
                await fileHashesResponse.Body.transformToString(),
            );
    } catch (e) {
        if (!(e instanceof NoSuchKey)) throw e;
    }

    // Upload the folder.
    await uploadFolder([]);

    // Get all the files that no longer exist by comparing the writtenKeys set to the fileHashes object.
    const filesToDelete: string[] = [];
    for (const key of Object.keys(fileHashes)) {
        if (!writtenKeys.has(key)) {
            if (!key.startsWith("_next")) {
                // Keep the old next files. Everything else is deleted, though.
                filesToDelete.push(key);
                delete fileHashes[key];
            }
        }
    }
    console.log(
        `Wrote ${writtenKeys.size} files. ${filesToDelete.length} files to delete.`,
    );
    const deletePromises = filesToDelete.map((key) =>
        tryOp10Times(async () => {
            try {
                await s3Client.send(
                    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
                );
            } catch (e) {
                if (!(e instanceof NoSuchKey)) throw e;
            }
            await kvDelete(key);
        }),
    );
    await Promise.all(deletePromises);

    // Write file_hashes.json to the bucket.
    await tryOp10Times(async () => {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: "file_hashes.json",
                Body: JSON.stringify(fileHashes),
            }),
        );
    });

    // Sleep for 1 minute because CF says it can take up to 60 seconds to update.
    console.log("Done! Sleeping for 1 minute to let CF update...");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    console.log("Done sleeping!");
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
