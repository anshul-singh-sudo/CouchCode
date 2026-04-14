import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT ?? "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "couchcode";

/**
 * Generate a signed GET URL for reading an object from R2.
 * Default expiry is 3600 seconds (1 hour) per Requirements 14.2, 27.1.
 */
export async function generateSignedGetUrl(
  path: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: path,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate a signed PUT URL for uploading an object to R2.
 * Default expiry is 3600 seconds (1 hour).
 */
export async function generateSignedPutUrl(
  path: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: path,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}
