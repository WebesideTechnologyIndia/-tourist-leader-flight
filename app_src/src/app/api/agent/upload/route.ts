import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public document upload for the agent registration form (no login yet).
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf",
};

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Uploads aren't configured yet (BLOB_READ_WRITE_TOKEN missing)." }, { status: 503 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!EXT[file.type]) return NextResponse.json({ error: "Only JPG, PNG, WebP or PDF files are allowed" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File must be under 6 MB" }, { status: 400 });

    const key = String(form.get("key") || "doc").replace(/[^a-z0-9_-]/gi, "") || "doc";
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(`agent-docs/${key}.${EXT[file.type]}`, buf, file.type);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
