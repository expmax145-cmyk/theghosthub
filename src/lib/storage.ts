"use client";
/**
 * Provider-independent storage interface. Only this file knows about Supabase Storage;
 * swapping to Cloudflare R2 / S3 means writing another implementation of `StorageProvider`
 * (the `files.storage_provider` column records which one holds each object).
 */
import * as tus from "tus-js-client";
import { getBrowserClient } from "./supabase/browser";
import { BUCKET, SUPABASE_KEY, SUPABASE_URL } from "./supabase/config";

export interface UploadHandle { abort: () => Promise<void> }

export interface StorageProvider {
  readonly name: string;
  upload(
    key: string,
    file: File,
    contentType: string,
    onProgress: (sent: number, total: number) => void,
  ): { done: Promise<void>; handle: UploadHandle };
  signedUrl(key: string, seconds: number, downloadName?: string): Promise<string>;
  remove(keys: string[]): Promise<void>;
  /** Size in bytes of a stored object (used to verify an upload landed intact). */
  size(key: string): Promise<number | null>;
}

export const supabaseStorage: StorageProvider = {
  name: "supabase",

  upload(key, file, contentType, onProgress) {
    let upload: tus.Upload;
    const done = new Promise<void>((resolve, reject) => {
      getBrowserClient()
        .auth.getSession()
        .then(({ data }: { data: { session: { access_token: string } | null } }) => {
          const token = data.session?.access_token;
          if (!token) return reject(new Error("Your session expired. Please sign in again."));
          upload = new tus.Upload(file, {
            endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
            // Back-offs let an interrupted upload (dropped mobile signal) resume where it stopped.
            retryDelays: [0, 2000, 5000, 10000, 20000],
            headers: { authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, "x-upsert": "false" },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: { bucketName: BUCKET, objectName: key, contentType, cacheControl: "3600" },
            chunkSize: 6 * 1024 * 1024,
            onError: (err) => reject(err),
            onProgress: (sent, total) => onProgress(sent, total),
            onSuccess: () => resolve(),
          });
          // Resume a previously interrupted upload of the same file if one is stored.
          upload.findPreviousUploads().then((prev) => {
            if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
            upload.start();
          });
        })
        .catch(reject);
    });
    return {
      done,
      handle: { abort: async () => { if (upload) await upload.abort(true); } },
    };
  },

  async signedUrl(key, seconds, downloadName) {
    const { data, error } = await getBrowserClient()
      .storage.from(BUCKET)
      .createSignedUrl(key, seconds, downloadName ? { download: downloadName } : undefined);
    if (error || !data) throw new Error(error?.message ?? "Could not create a download link.");
    return data.signedUrl;
  },

  async remove(keys) {
    if (!keys.length) return;
    const { error } = await getBrowserClient().storage.from(BUCKET).remove(keys);
    if (error) throw new Error(error.message);
  },

  async size(key) {
    const { data, error } = await getBrowserClient().storage.from(BUCKET).info(key);
    if (error || !data) return null;
    return typeof data.size === "number" ? data.size : null;
  },
};

export const storage: StorageProvider = supabaseStorage;
