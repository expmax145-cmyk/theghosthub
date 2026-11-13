"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { HubFile, OwnerProject } from "@/lib/types";
import { cx, formatBytes, formatDate } from "@/lib/utils";
import { extOf } from "@/lib/files";
import { deleteFiles, downloadFile, uploadFile } from "./ops";

type SortKey = "new" | "old" | "name" | "size";
const TYPE_FILTERS: Array<[string, (e: string) => boolean]> = [
  ["All types", () => true],
  ["Images", (e) => ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(e)],
  ["Video", (e) => ["mp4", "webm", "mov"].includes(e)],
  ["Apps & builds", (e) => ["apk", "aab", "exe", "unitypackage"].includes(e)],
  ["Archives", (e) => ["zip", "7z", "rar", "tar", "gz"].includes(e)],
  ["Documents", (e) => ["pdf", "docx", "xlsx", "pptx", "txt", "md", "csv", "json"].includes(e)],
];

export default function FileManager({ files, projects, ownerId, query }: { files: HubFile[]; projects: OwnerProject[]; ownerId: string; query: string }) {
  const router = useRouter();
  const [type, setType] = useState(0);
  const [projFilter, setProjFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirm, setConfirm] = useState<HubFile | null>(null);
  const [uploads, setUploads] = useState<Record<string, number>>({});
  const [uploadProject, setUploadProject] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const projName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = files.filter((f) => {
      if (!TYPE_FILTERS[type][1](extOf(f.original_filename))) return false;
      if (projFilter === "none" ? f.project_id !== null : projFilter !== "all" && f.project_id !== projFilter) return false;
      return !q || f.original_filename.toLowerCase().includes(q) || (projName.get(f.project_id ?? "") ?? "").toLowerCase().includes(q);
    });
    return [...list].sort((a, b) =>
      sort === "name" ? a.original_filename.localeCompare(b.original_filename)
        : sort === "size" ? b.file_size - a.file_size
        : sort === "old" ? +new Date(a.created_at) - +new Date(b.created_at)
        : +new Date(b.created_at) - +new Date(a.created_at));
  }, [files, type, projFilter, sort, query, projName]);

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id); setErr(null);
    try { await fn(); router.refresh(); } catch (e) { setErr(e instanceof Error ? e.message : "Action failed."); }
    setBusy(null);
  }

  async function patch(id: string, values: Partial<Pick<HubFile, "original_filename" | "project_id" | "visibility" | "folder">>) {
    const { error } = await getBrowserClient().from("files").update(values).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async function onPick(list: FileList | null) {
    if (!list) return;
    setErr(null);
    const errors: string[] = [];
    for (const file of Array.from(list)) {
      try {
        await uploadFile({ file, role: "attachment", ownerId, projectId: uploadProject || null, isPublic: false, onProgress: (p) => setUploads((u) => ({ ...u, [file.name]: p })) });
      } catch (e) { errors.push(e instanceof Error ? e.message : `Failed: ${file.name}`); }
      setUploads((u) => { const { [file.name]: _, ...rest } = u; return rest; });
    }
    if (errors.length) setErr(errors.join(" "));
    router.refresh();
    if (input.current) input.current.value = "";
  }

  return (
    <section aria-label="File manager" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select className="field sm:w-44" value={type} onChange={(e) => setType(Number(e.target.value))} aria-label="Filter by type">
          {TYPE_FILTERS.map(([l], i) => <option key={l} value={i}>{l}</option>)}
        </select>
        <select className="field sm:w-52" value={projFilter} onChange={(e) => setProjFilter(e.target.value)} aria-label="Filter by project">
          <option value="all">All projects</option><option value="none">Not in a project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="field sm:w-40" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort files">
          <option value="new">Newest</option><option value="old">Oldest</option><option value="name">Name</option><option value="size">Largest</option>
        </select>
        <div className="flex flex-1 items-center gap-2 sm:justify-end">
          <select className="field w-40 sm:w-44" value={uploadProject} onChange={(e) => setUploadProject(e.target.value)} aria-label="Upload into project">
            <option value="">Upload to library</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="btn btn-primary cursor-pointer">Upload<input ref={input} type="file" multiple className="sr-only" onChange={(e) => onPick(e.target.files)} /></label>
        </div>
      </div>

      {Object.entries(uploads).map(([n, p]) => (
        <div key={n} className="card p-3 text-xs text-muted">
          <div className="mb-1.5 flex justify-between"><span className="truncate">{n}</span><span>{p}%</span></div>
          <div className="h-1.5 overflow-hidden rounded bg-raised" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-accent transition-all" style={{ width: `${p}%` }} /></div>
        </div>
      ))}
      {err && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{err}</p>}

      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{files.length === 0 ? "No files yet. Upload an APK, ZIP, PDF or image to get started." : "No files match these filters."}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((f) => {
            const editing = renaming?.id === f.id;
            return (
              <li key={f.id} className={cx("card p-3 sm:p-4", busy === f.id && "opacity-60")}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = renaming.value.trim(); if (v) act(f.id, () => patch(f.id, { original_filename: v })).then(() => setRenaming(null)); }}>
                        <input className="field" value={renaming.value} onChange={(e) => setRenaming({ id: f.id, value: e.target.value })} maxLength={255} autoFocus aria-label="New file name" />
                        <button className="btn btn-primary btn-sm">Save</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming(null)}>Cancel</button>
                      </form>
                    ) : (
                      <p className="truncate text-sm font-medium">{f.original_filename}</p>
                    )}
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-faint">
                      <span>{formatBytes(f.file_size)}</span><span>{extOf(f.original_filename).toUpperCase() || "FILE"}</span>
                      <span>{formatDate(f.created_at)}</span><span>{f.role}</span>
                      <span className={f.visibility === "public" ? "text-sage" : ""}>{f.visibility}</span>
                      {f.checksum && <span title={f.checksum} className="font-mono">sha256 {f.checksum.slice(0, 10)}…</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="field min-h-9 w-40 py-0 text-[13px]" value={f.project_id ?? ""} aria-label={`Project for ${f.original_filename}`}
                      onChange={(e) => act(f.id, () => patch(f.id, { project_id: e.target.value || null }))}>
                      <option value="">No project</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => act(f.id, () => downloadFile(f))}>Download</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setRenaming({ id: f.id, value: f.original_filename })}>Rename</button>
                    {f.role === "attachment" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => act(f.id, () => patch(f.id, { visibility: f.visibility === "public" ? "private" : "public" }))}>
                        {f.visibility === "public" ? "Make private" : "Make public"}
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm(f)}>Delete</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-t">
          <div className="card w-full max-w-md space-y-4 p-6">
            <h3 id="del-t" className="font-display text-xl">Delete this file permanently?</h3>
            <p className="text-sm text-muted"><span className="text-text">{confirm.original_filename}</span> ({formatBytes(confirm.file_size)}) will be removed from storage
              {confirm.project_id ? ` and from “${projName.get(confirm.project_id)}”` : ""}. This cannot be undone. Make sure you have another copy (see the backup guide).</p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { const f = confirm; setConfirm(null); act(f.id, () => deleteFiles([f])); }}>Delete forever</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
