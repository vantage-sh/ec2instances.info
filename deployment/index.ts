import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { join } from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import mime from "mime";

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

async function uploadFile(key: string, filePath: string) {
    const fileStream = createReadStream(filePath);
    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileStream,
            ContentType: contentTypeHandler(filePath),
        }),
    );
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

uploadFolder([]).catch((e) => {
    console.error(e);
    process.exit(1);
});
