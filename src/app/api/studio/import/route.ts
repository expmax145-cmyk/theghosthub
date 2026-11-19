import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";
import { ImportError, safeFetch } from "@/lib/import/safe-fetch";
import { analyzeHtml, guessCategory, type Draft } from "@/lib/import/analyze";
import { apkFeatures, prettyName, readApk } from "@/lib/import/apk";
import { captureScreens } from "@/lib/import/screenshots";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_APK = 50 * 1024 * 1024;
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");
const imgType = (t: string, b: Uint8Array) =>
  /^image\/(png|jpeg|webp|gif)$/.test(t) ? t : b[0] === 0x89 && b[1] === 0x50 ? "image/png" : b[0] === 0xff && b[1] === 0xd8 ? "image/jpeg" : b[0] === 0x52 && b[1] === 0x49 ? "image/webp" : null;

interface Img { name: string; role: "thumbnail" | "screenshot" | "pan"; mime: string; data: string }

async function grabImages(cands: string[], max: number): Promise<{ mime: string; bytes: Uint8Array }[]> {
  const out: { mime: string; bytes: Uint8Array }[] = [];
  for (const u of cands) {
    if (out.length >= max) break;
    try {
      const r = await safeFetch(u, { maxBytes: 4_000_000, timeoutMs: 8000, accept: "image/*" });
      const mime = r.status === 200 && !r.truncated ? imgType(r.type, r.bytes) : null;
      if (mime && r.bytes.length > 2500) out.push({ mime, bytes: r.bytes });
    } catch { /* skip unreachable image */ }
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const db = await createUserClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to use import." }, { status: 401 });

  let body: { url?: string; categories?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const url = String(body.url ?? "").trim();
  const known = Array.isArray(body.categories) ? body.categories.filter((c) => typeof c === "string").slice(0, 50) : [];
  if (!url) return NextResponse.json({ error: "Paste a link first." }, { status: 400 });

  const notes: string[] = [];
  try {
    const first = await safeFetch(url, { maxBytes: MAX_APK + 1, timeoutMs: 45_000, accept: "text/html,application/vnd.android.package-archive,*/*" });
    const isApk = /android\.package-archive/.test(first.type) || /\.apk($|\?)/i.test(first.url) || (first.bytes[0] === 0x50 && first.bytes[1] === 0x4b);

    if (isApk) {
      if (first.truncated) throw new ImportError(`That APK is over ${MAX_APK / 1048576} MB, which is above the upload limit, so it can't be imported.`);
      const apk = readApk(first.bytes);
      const fileName = decodeURIComponent(new URL(first.url).pathname.split("/").pop() ?? "app.apk");
      const name = apk.label || prettyName(fileName) || prettyName(apk.packageName.split(".").pop() ?? "App");
      if (!apk.label) notes.push("The app's display name is stored as a resource, so it was guessed from the file name. Please check it.");
      const feats = apkFeatures(apk.permissions);
      const draft: Draft = {
        name, short_description: `${name} — an Android app${apk.versionName ? ` (v${apk.versionName})` : ""}.`,
        description: [`${name} is an Android application${apk.packageName ? ` (${apk.packageName})` : ""}.`, apk.minSdk ? `Requires Android API ${apk.minSdk}+${apk.targetSdk ? `, built for API ${apk.targetSdk}` : ""}.` : ""].filter(Boolean).join(" "),
        category: guessCategory(`${name} android apk`, [], true, known), technologies: ["Android", ...(apk.packageName.includes("unity") ? ["Unity"] : [])], tags: ["android", "apk"],
        features: feats, live_demo_url: "", status: "released", links: [], imageCandidates: [],
      };
      const images: Img[] = apk.icon ? [{ name: "app-icon.png", role: "thumbnail", mime: "image/png", data: b64(apk.icon) }] : [];
      notes.push("APK details were read from the file itself. Add screenshots or a preview video manually (an APK contains no screenshots). The APK can also be attached from your computer in “Files & downloads”.");
      const { imageCandidates: _a, ...apkDraft } = draft; void _a;
      return NextResponse.json({ kind: "apk", draft: apkDraft, images, notes, apk: { packageName: apk.packageName, versionName: apk.versionName, versionCode: apk.versionCode, size: first.bytes.length } });
    }

    if (first.status >= 400) throw new ImportError(`The website answered with an error (${first.status}).`);
    if (!/html|xml/.test(first.type) && first.type) throw new ImportError(`That link is a ${first.type || "file"}, not a web page or APK.`);
    const html = new TextDecoder().decode(first.bytes);
    const isPlay = /(^|\.)play\.google\.com$/.test(new URL(first.url).hostname);
    const draft = analyzeHtml(html, first.url, known);
    if (isPlay) {
      draft.name = draft.name.replace(/\s*[-–]\s*Apps on Google Play.*$/i, "");
      draft.category = guessCategory(`${draft.name} ${draft.short_description} android`, [], true, known);
      draft.technologies = ["Android"]; draft.live_demo_url = ""; draft.links.unshift({ label: "Google Play", url: first.url });
    }
    if (first.truncated) notes.push("The page was very large; only the first part was analysed.");

    const images: Img[] = [];
    const slug = (draft.name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "site";
    if (!isPlay) {
      const shots = await captureScreens(first.url).catch((e) => { notes.push(`Live screenshots unavailable (${e instanceof Error ? e.message : "browser error"}); used the site's own images instead.`); return null; });
      if (shots) {
        for (const s of shots.images) images.push({ name: `${slug}-${s.label}.jpg`, role: s.label === "fullpage" ? "pan" : "screenshot", mime: "image/jpeg", data: b64(s.bytes) });
        if (shots.title && !draft.name) draft.name = shots.title;
      }
    }
    const got = await grabImages(draft.imageCandidates, isPlay ? 7 : 4);
    got.forEach((g, i) => {
      const ext = g.mime.split("/")[1].replace("jpeg", "jpg");
      const role = i === 0 && !images.some((x) => x.role === "thumbnail") && (!isPlay || i === 0) ? "thumbnail" : "screenshot";
      images.push({ name: `${slug}-${role === "thumbnail" ? "cover" : "image" + i}.${ext}`, role, mime: g.mime, data: b64(g.bytes) });
    });
    if (!images.some((i) => i.role === "thumbnail") && images.length) { const s = images.find((i) => i.role === "screenshot")!; s.role = "thumbnail"; }
    if (!images.length) notes.push("No usable images were found. Add a thumbnail manually.");
    const { imageCandidates: _c, ...rest } = draft; void _c;
    return NextResponse.json({ kind: isPlay ? "play" : "website", draft: rest, images, notes });
  } catch (e) {
    const msg = e instanceof ImportError ? e.message : e instanceof Error && /zip|manifest|APK/i.test(e.message) ? e.message : "Import failed unexpectedly.";
    return NextResponse.json({ error: msg }, { status: e instanceof ImportError ? 422 : 500 });
  }
}
