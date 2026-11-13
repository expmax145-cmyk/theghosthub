"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { DEFAULT_CATEGORIES, STATUS_LABEL, type ExtraLink, type HubFile, type OwnerProject, type ProjectStatus, type Release, type Visibility } from "@/lib/types";
import { formatBytes, safeUrl, slugify, splitList, cx } from "@/lib/utils";
import { validateFile } from "@/lib/files";
import { deleteFiles, uploadFile } from "./ops";

interface Props {
  ownerId: string;
  project: OwnerProject | null; // null = new innovation
  files: HubFile[];
  releases: Release[];
  thumbs: Record<string, string>;
  categories: string[];
  onClose: () => void;
}

type Staged = { file: File; role: HubFile["role"]; isPublic: boolean };
type SaveMode = "draft" | "publish" | "keep";

function linesToLinks(text: string): { links: ExtraLink[]; bad: string[] } {
  const links: ExtraLink[] = [];
  const bad: string[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [label, ...rest] = line.includes("|") ? line.split("|") : ["Link", line];
    const url = safeUrl(rest.join("|").trim());
    if (url) links.push({ label: label.trim().slice(0, 40) || "Link", url });
    else bad.push(line);
  }
  return { links, bad };
}

export default function ProjectEditor({ ownerId, project, files, releases, thumbs, categories, onClose }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const isNew = !project;

  const [name, setName] = useState(project?.name ?? "");
  const [shortDesc, setShortDesc] = useState(project?.short_description ?? "");
  const [desc, setDesc] = useState(project?.description ?? "");
  const [category, setCategory] = useState(project?.category ?? DEFAULT_CATEGORIES[0]);
  const [newCat, setNewCat] = useState("");
  const [techs, setTechs] = useState((project?.technologies ?? []).join(", "));
  const [tags, setTags] = useState((project?.tags ?? []).join(", "));
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "in_progress");
  const [createdOn, setCreatedOn] = useState(project?.created_on ?? new Date().toISOString().slice(0, 10));
  const [features, setFeatures] = useState((project?.features ?? []).join("\n"));
  const [live, setLive] = useState(project?.live_demo_url ?? "");
  const [repo, setRepo] = useState(project?.repository_url ?? "");
  const [repoPublic, setRepoPublic] = useState(project?.repository_is_public ?? false);
  const [video, setVideo] = useState(project?.video_url ?? "");
  const [extra, setExtra] = useState((project?.extra_links ?? []).map((l) => `${l.label} | ${l.url}`).join("\n"));
  const [featured, setFeatured] = useState(project?.is_featured ?? false);
  const [more, setMore] = useState(!isNew);

  const mine = useMemo(() => (project ? files.filter((f) => f.project_id === project.id) : []), [files, project]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [staged, setStaged] = useState<Staged[]>([]);
  const [relList, setRelList] = useState<Release[]>(releases.filter((r) => r.project_id === project?.id));
  const [rel, setRel] = useState({ version: "", notes: "", pub: false });

  const [createdId, setCreatedId] = useState<string | null>(null); // set once a new project row exists
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  const stagedThumb = staged.find((s) => s.role === "thumbnail");
  const stagedThumbUrl = useMemo(() => (stagedThumb ? URL.createObjectURL(stagedThumb.file) : null), [stagedThumb]);
  useEffect(() => () => { if (stagedThumbUrl) URL.revokeObjectURL(stagedThumbUrl); }, [stagedThumbUrl]);

  const allCategories = useMemo(() => [...new Set([...DEFAULT_CATEGORIES, ...categories])], [categories]);

  function stage(list: FileList | null, role: HubFile["role"]) {
    if (!list) return;
    const errs: string[] = [];
    const add: Staged[] = [];
    for (const file of Array.from(list)) {
      const v = validateFile(file, role);
      if (!v.ok) errs.push(v.error!);
      else add.push({ file, role, isPublic: role !== "attachment" });
    }
    setErrors(errs);
    setStaged((s) => (role === "thumbnail" ? [...s.filter((x) => x.role !== "thumbnail"), ...add.slice(0, 1)] : [...s, ...add]));
  }

  async function save(mode: SaveMode) {
    const problems: string[] = [];
    if (!name.trim()) { setErrors(["Give the innovation a name."]); return; }
    const { links, bad } = linesToLinks(extra);
    if (bad.length) problems.push(`Ignored invalid link(s): ${bad.join("; ")}`);
    for (const [label, v] of [["Live demo", live], ["Repository", repo], ["Video", video]] as const) {
      if (v.trim() && !safeUrl(v)) { setErrors([`${label} URL must start with http:// or https://`]); return; }
    }

    setBusy(true);
    setErrors([]);
    const db = getBrowserClient();
    const visibility: Visibility = mode === "publish" ? "published" : mode === "draft" ? "draft" : project?.visibility ?? "draft";
    const finalCategory = (newCat.trim() || category).slice(0, 60);
    const fields = {
      name: name.trim().slice(0, 120),
      short_description: shortDesc.trim().slice(0, 280),
      description: desc.trim(),
      category: finalCategory,
      technologies: splitList(techs),
      tags: splitList(tags),
      status,
      created_on: createdOn || undefined,
      features: features.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 40),
      live_demo_url: safeUrl(live),
      repository_url: safeUrl(repo),
      repository_is_public: repoPublic && !!safeUrl(repo),
      video_url: safeUrl(video),
      extra_links: links,
      is_featured: featured,
      visibility,
    };

    // 1) project row (slug is generated once and never changes, so shared links stay valid)
    let projectId = project?.id ?? createdId;
    if (projectId) {
      const { error } = await db.from("projects").update(fields).eq("id", projectId);
      if (error) { setErrors([error.message]); setBusy(false); return; }
    } else {
      const base = slugify(fields.name);
      let saved: string | null = null;
      for (let i = 0; i < 6 && !saved; i++) {
        const slug = i === 0 ? base : `${base.slice(0, 74)}-${i + 1}`;
        const { data, error } = await db.from("projects").insert({ ...fields, owner_id: ownerId, slug }).select("id").single();
        if (!error && data) saved = data.id;
        else if (error && error.code !== "23505") { setErrors([error.message]); setBusy(false); return; }
      }
      if (!saved) { setErrors(["Could not create a unique link for this name. Try a slightly different name."]); setBusy(false); return; }
      projectId = saved;
      setCreatedId(saved);
    }

    // 2) uploads (each independent: one failure never discards the others)
    let newThumbId: string | null = null;
    for (const s of staged) {
      const id = `${s.role}:${s.file.name}:${s.file.size}`;
      try {
        const row = await uploadFile({ file: s.file, role: s.role, ownerId, projectId, isPublic: s.isPublic, onProgress: (p) => setProgress((x) => ({ ...x, [id]: p })) });
        if (s.role === "thumbnail") newThumbId = row.id;
        setStaged((x) => x.filter((y) => y !== s));
      } catch (e) {
        problems.push(e instanceof Error ? e.message : `Failed: ${s.file.name}`);
      }
    }
    if (newThumbId) {
      await db.from("projects").update({ thumbnail_file_id: newThumbId }).eq("id", projectId!);
      const old = mine.filter((f) => f.role === "thumbnail" && f.id !== newThumbId);
      await deleteFiles(old).catch((e) => problems.push(e.message));
    }

    // 3) explicitly removed files
    const gone = mine.filter((f) => removed.has(f.id) && f.id !== project?.thumbnail_file_id);
    try { await deleteFiles(gone); } catch (e) { problems.push(e instanceof Error ? e.message : "Could not delete a file."); }

    setBusy(false);
    router.refresh();
    if (problems.length) { setErrors([...problems, "The project itself was saved. Fix the issue above and save again to retry the failed files."]); return; }
    ref.current?.close();
  }

  async function addRelease() {
    if (!project || !rel.version.trim()) return;
    const { data, error } = await getBrowserClient().from("releases")
      .insert({ project_id: project.id, version: rel.version.trim(), release_notes: rel.notes.trim(), visibility: rel.pub ? "public" : "private" })
      .select("id,project_id,version,release_notes,release_date,visibility").single();
    if (error) { setErrors([error.code === "23505" ? "That version already exists." : error.message]); return; }
    setRelList((l) => [data as Release, ...l]);
    setRel({ version: "", notes: "", pub: false });
    router.refresh();
  }
  async function removeRelease(id: string) {
    const { error } = await getBrowserClient().from("releases").delete().eq("id", id);
    if (error) { setErrors([error.message]); return; }
    setRelList((l) => l.filter((r) => r.id !== id));
    router.refresh();
  }

  const existingThumb = mine.find((f) => f.id === project?.thumbnail_file_id) ?? mine.find((f) => f.role === "thumbnail");
  const thumbSrc = stagedThumbUrl ?? (existingThumb ? thumbs[existingThumb.id] : null);
  const existingShots = mine.filter((f) => f.role === "screenshot" || f.role === "video" || f.role === "attachment");

  return (
    <dialog ref={ref} onClose={onClose} onCancel={(e) => { if (busy) e.preventDefault(); }}
      className="m-0 ml-auto h-dvh w-full max-w-2xl overflow-y-auto border-l border-line bg-ink p-0 text-text" aria-label={isNew ? "Add new innovation" : `Edit ${project?.name}`}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/95 px-4 py-3 backdrop-blur sm:px-6">
        <h2 className="font-display text-xl">{isNew ? "Add new innovation" : "Edit innovation"}</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => ref.current?.close()} disabled={busy}>Close</button>
      </div>

      <form className="space-y-7 px-4 pb-28 pt-5 sm:px-6" onSubmit={(e) => { e.preventDefault(); save("keep"); }}>
        <section className="space-y-4">
          <div><label className="label" htmlFor="pn">Name *</label>
            <input id="pn" className="field" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoFocus={isNew} placeholder="Apex Horizon 3D" /></div>
          <div><label className="label" htmlFor="ps">Short description <span className="text-faint">({shortDesc.length}/280)</span></label>
            <textarea id="ps" className="field" rows={2} maxLength={280} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="One or two lines shown on the card." /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="pc">Category</label>
              <select id="pc" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {[...new Set([category, ...allCategories])].map((c) => <option key={c}>{c}</option>)}
              </select>
              <input className="field mt-2" placeholder="…or type a new category" value={newCat} maxLength={60} onChange={(e) => setNewCat(e.target.value)} aria-label="New category" /></div>
            <div><label className="label" htmlFor="pst">Status</label>
              <select id="pst" className="field" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
          </div>
          <div><label className="label" htmlFor="pt">Technologies <span className="text-faint">(comma separated)</span></label>
            <input id="pt" className="field" value={techs} onChange={(e) => setTechs(e.target.value)} placeholder="Unity, C#, Android" /></div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Visuals</h3>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface text-xs text-faint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumbSrc ? <img src={thumbSrc} alt="Thumbnail preview" className="h-full w-full object-cover" /> : "No thumbnail"}
            </div>
            <label className="btn btn-ghost cursor-pointer">
              {thumbSrc ? "Replace thumbnail" : "Choose thumbnail"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => { stage(e.target.files, "thumbnail"); e.target.value = ""; }} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="btn btn-ghost cursor-pointer justify-start">＋ Screenshots
              <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => { stage(e.target.files, "screenshot"); e.target.value = ""; }} /></label>
            <label className="btn btn-ghost cursor-pointer justify-start">＋ Preview video
              <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => { stage(e.target.files, "video"); e.target.value = ""; }} /></label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Files &amp; downloads</h3>
          <label className="btn btn-ghost w-full cursor-pointer justify-center border-dashed">＋ Add APK, ZIP, PDF, source archive, game build…
            <input type="file" multiple className="sr-only" onChange={(e) => { stage(e.target.files, "attachment"); e.target.value = ""; }} /></label>
          <p className="text-xs text-faint">Files stay private unless you tick “Public download”. Per-file limit {formatBytes(Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES ?? 52428800))}.</p>

          <ul className="space-y-2">
            {existingShots.map((f) => {
              const gone = removed.has(f.id);
              return (
                <li key={f.id} className={cx("card flex items-center justify-between gap-3 p-3 text-sm", gone && "opacity-50")}>
                  <div className="min-w-0"><p className={cx("truncate", gone && "line-through")}>{f.original_filename}</p>
                    <p className="text-xs text-faint">{f.role} · {formatBytes(f.file_size)} · {f.visibility}</p></div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemoved((s) => { const n = new Set(s); gone ? n.delete(f.id) : n.add(f.id); return n; })}>{gone ? "Keep" : "Remove"}</button>
                </li>
              );
            })}
            {staged.filter((s) => s.role !== "thumbnail").map((s, i) => {
              const id = `${s.role}:${s.file.name}:${s.file.size}`;
              const pct = progress[id];
              return (
                <li key={id + i} className="card space-y-2 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="truncate">{s.file.name}</p><p className="text-xs text-faint">{s.role} · {formatBytes(s.file.size)} · ready to upload</p></div>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStaged((x) => x.filter((y) => y !== s))}>Remove</button>
                  </div>
                  {s.role === "attachment" && (
                    <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={s.isPublic} onChange={(e) => setStaged((x) => x.map((y) => (y === s ? { ...y, isPublic: e.target.checked } : y)))} /> Public download (visible once the project is published)</label>
                  )}
                  {busy && pct !== undefined && <div className="h-1.5 overflow-hidden rounded bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-4">
          <button type="button" className="text-sm text-accent hover:underline" onClick={() => setMore((m) => !m)} aria-expanded={more}>{more ? "− Hide" : "+ Show"} details, links &amp; options</button>
          {more && (
            <div className="space-y-4">
              <div><label className="label" htmlFor="pd">Detailed description</label>
                <textarea id="pd" className="field" rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What it is, why you built it, what you learned. Blank line = new paragraph." /></div>
              <div><label className="label" htmlFor="pf">Features <span className="text-faint">(one per line)</span></label>
                <textarea id="pf" className="field" rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="pl">Live website / playable demo URL</label><input id="pl" className="field" inputMode="url" value={live} onChange={(e) => setLive(e.target.value)} placeholder="https://" /></div>
                <div><label className="label" htmlFor="pv">Video demonstration URL</label><input id="pv" className="field" inputMode="url" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://" /></div>
              </div>
              <div><label className="label" htmlFor="pr">GitHub repository URL</label><input id="pr" className="field" inputMode="url" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/…" />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={repoPublic} onChange={(e) => setRepoPublic(e.target.checked)} /> Show this link publicly (otherwise it stays private)</label></div>
              <div><label className="label" htmlFor="pe">Other links <span className="text-faint">(one per line: Label | https://…)</span></label>
                <textarea id="pe" className="field" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="pg">Tags</label><input id="pg" className="field" value={tags} onChange={(e) => setTags(e.target.value)} /></div>
                <div><label className="label" htmlFor="pco">Creation date</label><input id="pco" className="field" type="date" value={createdOn} onChange={(e) => setCreatedOn(e.target.value)} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Feature on the showcase homepage</label>

              {project && (
                <div className="space-y-3 border-t border-line pt-4">
                  <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Release history</h3>
                  <ul className="space-y-2">
                    {relList.map((r) => (
                      <li key={r.id} className="card flex items-start justify-between gap-3 p-3 text-sm">
                        <div><p>v{r.version} <span className="text-xs text-faint">· {r.release_date} · {r.visibility}</span></p>{r.release_notes && <p className="mt-1 whitespace-pre-line text-xs text-muted">{r.release_notes}</p>}</div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRelease(r.id)}>Delete</button>
                      </li>
                    ))}
                  </ul>
                  <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
                    <input className="field" placeholder="1.0.0" value={rel.version} onChange={(e) => setRel({ ...rel, version: e.target.value })} aria-label="Version" />
                    <input className="field" placeholder="Release notes" value={rel.notes} onChange={(e) => setRel({ ...rel, notes: e.target.value })} aria-label="Release notes" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={rel.pub} onChange={(e) => setRel({ ...rel, pub: e.target.checked })} /> Show publicly</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addRelease} disabled={!rel.version.trim()}>Add release</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {errors.length > 0 && (
          <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <ul className="space-y-1">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20 ml-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur sm:px-6">
          <p className="text-xs text-faint">{project ? (project.visibility === "published" ? "Currently public" : project.visibility === "archived" ? "Archived" : "Private draft") : "New · private until you publish"}</p>
          <div className="flex gap-2">
            {isNew || project?.visibility !== "published" ? (
              <>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(isNew ? "draft" : "keep")}>{busy ? "Saving…" : "Save draft"}</button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save("publish")}>Publish</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save("draft")}>Unpublish</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
              </>
            )}
          </div>
        </div>
      </form>
    </dialog>
  );
}
