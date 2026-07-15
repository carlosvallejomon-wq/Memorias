import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = process.env.S3_BUCKET!;

// Base pública desde la que se sirven los ficheros (CDN/dominio público de
// R2, o el propio endpoint en local con MinIO). Puede diferir del endpoint
// usado para firmar, que es el endpoint de API interno del proveedor.
const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL ?? `${process.env.S3_ENDPOINT}/${bucket}`;

export const s3Client = new S3Client({
  region: process.env.S3_REGION ?? 'auto',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

// Genera una URL firmada de subida directa (PUT): el binario viaja del
// cliente al bucket sin pasar por nuestro servidor.
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export function publicUrlFor(key: string): string {
  return `${publicBaseUrl}/${key}`;
}
