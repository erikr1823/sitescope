import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`${name} is not set`);
  }
  return v.trim();
}

export function getR2Client(): S3Client {
  if (client) return client;

  const endpoint = requireEnv("R2_ENDPOINT");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  return client;
}

export function getR2Bucket(): string {
  return requireEnv("R2_BUCKET_NAME");
}

export async function putR2Object(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const s3 = getR2Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function getR2SignedGetUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const s3 = getR2Client();
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );
}
