import type { ShowcaseProject } from "./showcase";
import { safeUrl } from "./utils";

export type Kind = "app" | "game" | "website" | "project";

export const isApk = (name: string) => /\.apk$/i.test(name);

/** Newest APK attached to a project, if any. */
export function latestApk(p: ShowcaseProject) {
  return [...p.downloads].filter((d) => isApk(d.original_filename)).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0] ?? null;
}

export function kindOf(p: ShowcaseProject): Kind {
  if (latestApk(p)) return "app";
  if (safeUrl(p.live_demo_url)) return /game/i.test(p.category) ? "game" : "website";
  return "project";
}

/** Where a tile leads: apps open their store page, live sites redirect to the owner's own site. */
export function tileHref(p: ShowcaseProject): string {
  const k = kindOf(p);
  return k === "game" || k === "website" ? `/go/${p.slug}` : `/p/${p.slug}`;
}

export const KIND_LABEL: Record<Kind, string> = { app: "APK", game: "Game", website: "Website", project: "Project" };
export const KIND_ACTION: Record<Kind, string> = { app: "Install ↓", game: "Play ▶", website: "Visit ↗", project: "View" };
