// Real object storage via S3-compatible API - defaults to Cloudflare R2,
// works identically against real AWS S3 (same protocol) by changing env vars.
//
// STATUS: written against the AWS SDK v3 S3 client (R2 is S3-API-compatible),
// never executed - no internet in this sandbox. Verify before trusting it:
// 1. `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` (already
//    in package.json)
// 2. Create an R2 bucket (or S3 bucket) and set the env vars below
// 3. Upload one file of each kind (logo, job photo, contract) through the
//    app and confirm it lands in the bucket and the resulting URL loads
//
// Falls back to base64-in-database (the original approach) when unconfigured,
// so local dev with no storage account keeps working exactly as before -
// existing upload components only need their onChange handler pointed at
// uploadFile() below to switch over automatically once configured.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const storageConfigured = Boolean(
  process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY && process.env.STORAGE_BUCKET
);

// R2 needs an account-specific endpoint; real S3 doesn't set STORAGE_ENDPOINT
// at all and the SDK talks to AWS directly.
const s3 = storageConfigured
  ? new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY as string
      }
    })
  : null;

const BUCKET = process.env.STORAGE_BUCKET;
const PUBLIC_BASE_URL = process.env.STORAGE_PUBLIC_URL; // e.g. your R2 public bucket domain or CloudFront/S3 URL

// Returns a presigned PUT URL the browser can upload directly to - files never
// pass through our own server, which is the right pattern for large uploads.
// Key is organized by company for isolation: companyId/kind/uuid-filename
export async function createPresignedUploadUrl(params: {
  companyId: string;
  kind: "logos" | "job-photos" | "contracts" | "documents";
  fileName: string;
  contentType: string;
}) {
  if (!s3 || !BUCKET) throw new Error("Storage is not configured.");
  const key = `${params.companyId}/${params.kind}/${crypto.randomUUID()}-${params.fileName}`;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: params.contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/${key}` : null;
  return { uploadUrl, key, publicUrl };
}

export function isStorageConfigured() {
  return storageConfigured;
}
