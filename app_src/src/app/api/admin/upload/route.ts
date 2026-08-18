import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

export async function POST(req: NextRequest) {
  const { ok, permissions } = await isAdmin();
  if (!ok || !permissions.includes("packages.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Image uploads aren't configured yet. Create a Vercel Blob store and set BLOB_READ_WRITE_TOKEN, then redeploy." }, { status: 503 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Only JPG, PNG, WebP, AVIF or GIF images are allowed" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });

    const folder = String(form.get("folder") || "uploads").replace(/[^a-z0-9/_-]/gi, "") || "uploads";
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(`${folder}/image.${EXT[file.type] || "jpg"}`, buf, file.type);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
