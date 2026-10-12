import { NextResponse } from "next/server";
import { tooMany } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const BUCKET = "avatars";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// upload a profile photo for the signed-in customer; returns its public URL
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "customer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (tooMany(`avatar:${user.id}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many photo changes. Please wait a few minutes and try again." }, { status: 429 });
  }

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Image is too large (4 MB max)." }, { status: 400 });

  const storage = supabaseAdmin().storage;
  await storage.createBucket(BUCKET, { public: true }); // already exists after the first upload; that error is fine

  const path = `${user.id}-${Date.now()}.${ext}`;
  const { error } = await storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) {
    console.error("avatar upload failed", error);
    return NextResponse.json({ error: "Could not upload the photo. Please try again." }, { status: 500 });
  }

  // keep only the newest photo per account, so repeated uploads can't pile up in storage
  const { data: mine } = await storage.from(BUCKET).list("", { search: user.id, limit: 100 });
  const old = (mine ?? []).map((f) => f.name).filter((n) => n.startsWith(`${user.id}-`) && n !== path);
  if (old.length) await storage.from(BUCKET).remove(old).catch(() => {});

  return NextResponse.json({ url: storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}
