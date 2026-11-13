import type { FileRole } from "./types";

export const MAX_UPLOAD_BYTES = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES ?? 52_428_800);
export const STORAGE_QUOTA_BYTES = Number(process.env.NEXT_PUBLIC_STORAGE_QUOTA_BYTES ?? 1_073_741_824);

// extension -> canonical mime. Anything not listed is rejected (allow-list, not deny-list).
const ALLOWED: Record<string, string> = {
  apk: "application/vnd.android.package-archive",
  zip: "application/zip",
  "7z": "application/x-7z-compressed",
  rar: "application/vnd.rar",
  tar: "application/x-tar",
  gz: "application/gzip",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  aab: "application/octet-stream",
  exe: "application/octet-stream",
  unitypackage: "application/octet-stream",
};

export const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
export const VIDEO_EXT = new Set(["mp4", "webm", "mov"]);

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

export interface ValidationResult { ok: boolean; error?: string; mime?: string }

export function validateFile(file: { name: string; size: number }, role: FileRole): ValidationResult {
  const ext = extOf(file.name);
  const mime = ALLOWED[ext];
  if (!mime) return { ok: false, error: `".${ext || "?"}" files are not supported.` };
  if (file.size <= 0) return { ok: false, error: `${file.name} is empty.` };
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `${file.name} is ${(file.size / 1048576).toFixed(1)} MB; the storage limit is ${Math.round(
        MAX_UPLOAD_BYTES / 1048576,
      )} MB per file. Host larger builds on GitHub Releases or Drive and add the link instead.`,
    };
  }
  if ((role === "thumbnail" || role === "screenshot") && !IMAGE_EXT.has(ext)) {
    return { ok: false, error: `${file.name}: images must be PNG, JPG, WEBP or GIF.` };
  }
  if (role === "video" && !VIDEO_EXT.has(ext)) {
    return { ok: false, error: `${file.name}: videos must be MP4, WebM or MOV.` };
  }
  return { ok: true, mime };
}

/** Browsers are never allowed to render user-uploaded SVG/HTML inline from our origin. */
export function isInlineImage(mime: string): boolean {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/webp" || mime === "image/gif";
}

export async function sha256Hex(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Unguessable object key. The original filename is never part of the key. */
export function randomKey(ext: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${id}${ext ? "." + ext : ""}`;
}
