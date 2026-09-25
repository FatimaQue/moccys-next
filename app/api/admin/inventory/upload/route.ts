import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "menu-images";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// upload a photo for a new menu item; returns its public URL
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Image is too large (4 MB max)." }, { status: 400 });

  const storage = supabaseAdmin().storage;
  await storage.createBucket(BUCKET, { public: true }); // already exists after the first upload; that error is fine

  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) {
    console.error("image upload failed", error);
    return NextResponse.json({ error: "Could not upload the image. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ url: storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}
