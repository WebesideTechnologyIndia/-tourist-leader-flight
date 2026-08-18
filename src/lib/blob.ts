/**
 * Vercel Blob image helper. Uploads (e.g. airline logos, offer banners,
 * user-uploaded ID docs) to Blob storage and returns a public URL.
 * Requires BLOB_READ_WRITE_TOKEN. Safe to import on the server only.
 */
import { put, list, del } from "@vercel/blob";

export async function uploadImage(pathname: string, data: Buffer | Blob | ArrayBuffer, contentType?: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const blob = await put(pathname, data as Buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function listImages(prefix?: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const { blobs } = await list({ prefix });
  return blobs.map((b) => ({ url: b.url, pathname: b.pathname, size: b.size }));
}

export async function deleteImage(url: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await del(url);
}
