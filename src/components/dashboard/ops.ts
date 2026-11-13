"use client";
import { extOf, randomKey, sha256Hex, validateFile } from "@/lib/files";
import { storage } from "@/lib/storage";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { FileRole, HubFile } from "@/lib/types";

export interface UploadArgs {
  file: File;
  role: FileRole;
  ownerId: string;
  projectId: string | null;
  isPublic: boolean;
  onProgress?: (pct: number) => void;
}

const FILE_COLS = "id,project_id,folder,role,original_filename,storage_key,mime_type,file_size,checksum,visibility,sort_order,created_at";

/** validate → hash → resumable upload → verify stored size → record metadata. Rolls back the object on failure. */
export async function uploadFile(a: UploadArgs): Promise<HubFile> {
  const v = validateFile(a.file, a.role);
  if (!v.ok) throw new Error(v.error);
  const checksum = await sha256Hex(a.file);
  const key = randomKey(extOf(a.file.name));
  const { done } = storage.upload(key, a.file, v.mime!, (sent, total) => a.onProgress?.(Math.round((sent / total) * 100)));
  try {
    await done;
  } catch (e) {
    throw new Error(`Upload of ${a.file.name} failed: ${e instanceof Error ? e.message : "network error"}. Retrying the upload will resume where it stopped.`);
  }
  const stored = await storage.size(key);
  if (stored !== null && stored !== a.file.size) {
    await storage.remove([key]).catch(() => {});
    throw new Error(`${a.file.name} was corrupted in transit (size mismatch). Please upload it again.`);
  }
  const { data, error } = await getBrowserClient()
    .from("files")
    .insert({
      owner_id: a.ownerId,
      project_id: a.projectId,
      role: a.role,
      original_filename: a.file.name,
      storage_provider: storage.name,
      storage_key: key,
      mime_type: v.mime,
      file_size: a.file.size,
      checksum,
      visibility: a.isPublic ? "public" : "private",
    })
    .select(FILE_COLS)
    .single();
  if (error || !data) {
    await storage.remove([key]).catch(() => {});
    throw new Error(error?.message ?? "Could not save file record.");
  }
  return data as HubFile;
}

/** Removes the stored object first, then the row, so a failure never leaves an orphan that looks deleted. */
export async function deleteFiles(files: HubFile[]): Promise<void> {
  if (!files.length) return;
  await storage.remove(files.map((f) => f.storage_key));
  const { error } = await getBrowserClient().from("files").delete().in("id", files.map((f) => f.id));
  if (error) throw new Error(error.message);
}

export async function downloadFile(f: Pick<HubFile, "storage_key" | "original_filename">) {
  const url = await storage.signedUrl(f.storage_key, 60, f.original_filename);
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function previewUrl(key: string): Promise<string> {
  return storage.signedUrl(key, 300);
}
