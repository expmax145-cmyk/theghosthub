import type { Metadata } from "next";
import { createUserClient } from "@/lib/supabase/server";
import { BUCKET, isConfigured } from "@/lib/supabase/config";
import { isInlineImage } from "@/lib/files";
import type { DashboardData } from "@/lib/dashboard-types";
import type { HubFile, OwnerProject, Release } from "@/lib/types";
import Login from "@/components/dashboard/Login";
import Dashboard from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Creator Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const FILE_COLS = "id,project_id,folder,role,original_filename,storage_key,mime_type,file_size,checksum,visibility,sort_order,created_at";

export default async function Studio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (!isConfigured()) return <Login state="unconfigured" />;

  const db = await createUserClient();
  const { data: auth } = await db.auth.getUser(); // validated against the auth server, not just the cookie
  const user = auth.user;
  if (!user) return <Login state="signed-out" notice={sp.error === "link" ? "That link has expired. Request a new one." : undefined} />;

  // Server-side owner check. RLS enforces the same rule on every query below.
  const { data: owner } = await db.rpc("is_owner");
  const { data: profile } = await db.from("profiles").select("id,display_name,avatar_url,headline,bio,is_owner").eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_owner) return <Login state="not-owner" email={user.email ?? ""} />;
  if (owner !== true) return <Login state="mfa" email={user.email ?? ""} />;

  if (sp.reset === "1") return <Login state="reset" email={user.email ?? ""} />;

  const [p, f, r, a, factors] = await Promise.all([
    db.from("projects").select("*").order("updated_at", { ascending: false }),
    db.from("files").select(FILE_COLS).order("created_at", { ascending: false }),
    db.from("releases").select("id,project_id,version,release_notes,release_date,visibility").order("release_date", { ascending: false }),
    db.from("activity_log").select("id,operation,resource_type,detail,created_at").order("created_at", { ascending: false }).limit(25),
    db.auth.mfa.listFactors(),
  ]);

  const files = (f.data ?? []) as HubFile[];
  const thumbs: Record<string, string> = {};
  const imgs = files.filter((x) => (x.role === "thumbnail" || x.role === "screenshot") && isInlineImage(x.mime_type)).slice(0, 200);
  if (imgs.length) {
    const { data } = await db.storage.from(BUCKET).createSignedUrls(imgs.map((x) => x.storage_key), 3600);
    const byKey = new Map(data?.map((s) => [s.path, s.signedUrl]) ?? []);
    imgs.forEach((x) => { const u = byKey.get(x.storage_key); if (u) thumbs[x.id] = u; });
  }

  const data: DashboardData = {
    profile: profile as DashboardData["profile"],
    email: user.email ?? "",
    projects: (p.data ?? []) as OwnerProject[],
    files,
    releases: (r.data ?? []) as Release[],
    thumbs,
    activity: a.data ?? [],
    mfaEnrolled: (factors.data?.totp ?? []).some((x) => x.status === "verified"),
  };
  return <Dashboard data={data} loadError={p.error?.message ?? f.error?.message} />;
}
