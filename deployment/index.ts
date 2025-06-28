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

async function uploadFile(key: string, filePath: string) {
    const file = await fs.readFile(filePath);
    const hash = crypto.createHash("sha256").update(file).digest("hex");
    if (fileHashes[key] === hash) {
        return;
    }
    fileHashes[key] = hash;
    writtenKeys.add(key);

    const ContentType = contentTypeHandler(filePath);
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
        if (e instanceof NoSuchKey) {
            fileHashes = {};
        } else {
            throw e;
        }
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
        tryOp10Times(() =>
            s3Client.send(
                new DeleteObjectCommand({ Bucket: bucket, Key: key }),
            ),
        ),
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
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
