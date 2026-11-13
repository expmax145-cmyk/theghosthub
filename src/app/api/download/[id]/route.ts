import { NextResponse, type NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { BUCKET, isConfigured } from "@/lib/supabase/config";

// Best-effort per-instance limiter (serverless instances do not share memory). It slows casual
// abuse; real protection is that only explicitly-public files of published projects resolve at all.
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  h.n += 1;
  return h.n > 20;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isConfigured() || !UUID.test(id)) return new NextResponse("Not found", { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "60" } });

  const db = createAnonClient();
  // RLS returns the row only if it is public and its project is published.
  const { data: file } = await db
    .from("files")
    .select("storage_key,original_filename")
    .eq("id", id)
    .eq("role", "attachment")
    .maybeSingle();
  if (!file) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_key, 60, { download: file.original_filename });
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  const res = NextResponse.redirect(data.signedUrl, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
