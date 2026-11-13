import "server-only";
import { createAnonClient } from "./supabase/anon";
import { BUCKET, isConfigured } from "./supabase/config";
import { isInlineImage } from "./files";
import type { HubFile, Profile, Project, Release } from "./types";

export interface PublicFile extends HubFile { url: string | null }
export interface ShowcaseProject extends Project {
  thumb: string | null;
  screenshots: PublicFile[];
  videos: PublicFile[];
  downloads: PublicFile[];
  releases: Release[];
}
export interface ShowcaseData {
  configured: boolean;
  profile: Profile | null;
  projects: ShowcaseProject[];
  error?: string;
}

const PROJECT_COLS =
  "id,name,slug,short_description,description,features,category,technologies,tags,status,visibility,thumbnail_file_id,live_demo_url,video_url,extra_links,is_featured,created_on,published_at,created_at,updated_at,public_repository_url";
const FILE_COLS =
  "id,project_id,role,original_filename,storage_key,mime_type,file_size,checksum,visibility,sort_order,created_at";

/** Everything here runs as the `anon` role: RLS + column grants decide what is visible. */
export async function loadShowcase(): Promise<ShowcaseData> {
  if (!isConfigured()) return { configured: false, profile: null, projects: [] };
  const db = createAnonClient();

  const [p, f, r, pr] = await Promise.all([
    db.from("projects").select(PROJECT_COLS).order("is_featured", { ascending: false }).order("updated_at", { ascending: false }),
    db.from("files").select(FILE_COLS).order("sort_order").order("created_at"),
    db.from("releases").select("id,project_id,version,release_notes,release_date,visibility").order("release_date", { ascending: false }),
    db.from("profiles").select("id,display_name,avatar_url,headline,bio").limit(1),
  ]);
  const err = p.error ?? f.error ?? r.error ?? pr.error;
  if (err) return { configured: true, profile: null, projects: [], error: "Could not load the showcase right now." };

  const files = (f.data ?? []) as HubFile[];
  // Signed URLs only for objects the anon role is allowed to read (images/video previews).
  const toSign = files.filter((x) => x.role !== "attachment" && (isInlineImage(x.mime_type) || x.role === "video"));
  const urlByKey = new Map<string, string>();
  if (toSign.length) {
    const { data } = await db.storage.from(BUCKET).createSignedUrls(toSign.map((x) => x.storage_key), 3600);
    data?.forEach((s) => { if (s.path && s.signedUrl) urlByKey.set(s.path, s.signedUrl); });
  }
  const withUrl = (x: HubFile): PublicFile => ({ ...x, url: urlByKey.get(x.storage_key) ?? null });

  const projects: ShowcaseProject[] = ((p.data ?? []) as Project[]).map((proj) => {
    const mine = files.filter((x) => x.project_id === proj.id);
    const thumbFile = mine.find((x) => x.id === proj.thumbnail_file_id) ?? mine.find((x) => x.role === "thumbnail");
    return {
      ...proj,
      thumb: thumbFile ? urlByKey.get(thumbFile.storage_key) ?? null : null,
      screenshots: mine.filter((x) => x.role === "screenshot").map(withUrl),
      videos: mine.filter((x) => x.role === "video").map(withUrl),
      downloads: mine.filter((x) => x.role === "attachment"),
      releases: ((r.data ?? []) as Release[]).filter((x) => x.project_id === proj.id),
    } as ShowcaseProject;
  });

  return { configured: true, profile: ((pr.data ?? [])[0] as Profile) ?? null, projects };
}
