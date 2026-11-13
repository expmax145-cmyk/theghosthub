"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { DashboardData } from "@/lib/dashboard-types";
import { STATUS_LABEL, type OwnerProject, type Visibility } from "@/lib/types";
import { STORAGE_QUOTA_BYTES } from "@/lib/files";
import { cx, formatBytes, formatDate } from "@/lib/utils";
import { deleteFiles } from "./ops";
import ProjectEditor from "./ProjectEditor";
import FileManager from "./FileManager";
import SettingsPanel from "./SettingsPanel";

const VIS_STYLE: Record<Visibility, string> = {
  published: "border-sage/50 text-sage",
  draft: "border-line text-muted",
  archived: "border-faint/40 text-faint",
};
const VIS_LABEL: Record<Visibility, string> = { published: "Published", draft: "Private draft", archived: "Archived" };

export default function Dashboard({ data, loadError }: { data: DashboardData; loadError?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"projects" | "files">("projects");
  const [q, setQ] = useState("");
  const [vis, setVis] = useState<"all" | Visibility>("all");
  const [editor, setEditor] = useState<{ project: OwnerProject | null } | null>(null);
  const [settings, setSettings] = useState(false);
  const [menu, setMenu] = useState(false);
  const [del, setDel] = useState<OwnerProject | null>(null);
  const [delFiles, setDelFiles] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(loadError ?? null);

  const { projects, files } = data;
  const used = files.reduce((n, f) => n + f.file_size, 0);
  const pct = Math.min(100, Math.round((used / STORAGE_QUOTA_BYTES) * 100));
  const counts = useMemo(() => ({
    published: projects.filter((p) => p.visibility === "published").length,
    draft: projects.filter((p) => p.visibility === "draft").length,
    archived: projects.filter((p) => p.visibility === "archived").length,
  }), [projects]);
  const categories = useMemo(() => [...new Set(projects.map((p) => p.category))], [projects]);
  const thumbOf = (p: OwnerProject) => {
    const f = files.find((x) => x.id === p.thumbnail_file_id) ?? files.find((x) => x.project_id === p.id && x.role === "thumbnail");
    return f ? data.thumbs[f.id] : undefined;
  };

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return projects.filter((p) => (vis === "all" || p.visibility === vis) &&
      (!n || [p.name, p.category, p.short_description, ...p.technologies, ...p.tags].join(" ").toLowerCase().includes(n)));
  }, [projects, q, vis]);
  const recentAdded = [...projects].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 3);
  const recentUpdated = [...projects].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 3);

  async function setVisibility(p: OwnerProject, v: Visibility) {
    setBusy(p.id); setErr(null);
    const { error } = await getBrowserClient().from("projects").update({ visibility: v }).eq("id", p.id);
    if (error) setErr(error.message);
    setBusy(null); router.refresh();
  }

  async function confirmDelete() {
    if (!del) return;
    const p = del; setDel(null); setBusy(p.id); setErr(null);
    try {
      const mine = files.filter((f) => f.project_id === p.id);
      // Files are removed first (if the owner chose so); the project row only goes once that succeeded.
      if (delFiles) await deleteFiles(mine);
      const { error } = await getBrowserClient().from("projects").delete().eq("id", p.id);
      if (error) throw new Error(error.message);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not delete."); }
    setDelFiles(false); setBusy(null); router.refresh();
  }

  const delCount = del ? files.filter((f) => f.project_id === del.id).length : 0;
  const delBytes = del ? files.filter((f) => f.project_id === del.id).reduce((n, f) => n + f.file_size, 0) : 0;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-accent/40 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/studio" className="shrink-0 font-display text-lg"><span className="eyes" aria-hidden="true"><i /><i /></span>Ghost<span className="text-accent"> Hub</span><span className="ml-2 hidden text-xs uppercase tracking-[0.16em] text-faint sm:inline">Creator dashboard</span></Link>
          <input className="field mx-auto min-h-9 max-w-md flex-1 py-0" type="search" placeholder={tab === "files" ? "Search files…" : "Search projects…"} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <div className="hidden w-32 shrink-0 text-[11px] text-faint md:block" title={`${formatBytes(used)} of ${formatBytes(STORAGE_QUOTA_BYTES)} used`}>
            <div className="mb-1 flex justify-between"><span>Storage</span><span>{pct}%</span></div>
            <div className="h-1 overflow-hidden rounded bg-raised"><div className={cx("h-full", pct > 85 ? "bg-danger" : "bg-accent")} style={{ width: `${pct}%` }} /></div>
          </div>
          <Link href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex" target="_blank">Showcase ↗</Link>
          <div className="relative">
            <button className="btn btn-ghost btn-sm" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Profile menu">{data.profile.display_name.slice(0, 1).toUpperCase()}</button>
            {menu && (
              <div role="menu" className="card absolute right-0 mt-2 w-48 p-1 shadow-xl" onMouseLeave={() => setMenu(false)}>
                <button role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-raised" onClick={() => { setMenu(false); setSettings(true); }}>Settings &amp; security</button>
                <Link role="menuitem" href="/" className="block rounded-md px-3 py-2 text-sm hover:bg-raised sm:hidden">View showcase</Link>
                <button role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-raised" onClick={async () => { await getBrowserClient().auth.signOut(); window.location.href = "/studio"; }}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-accent">Welcome back</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl">{data.profile.display_name}</h1>
          </div>
          <button className="btn btn-primary min-h-12 px-6 text-base" onClick={() => setEditor({ project: null })}>＋ Add new innovation</button>
        </section>

        {err && <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{err}</p>}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Overview">
          {[["Projects", projects.length], ["Files", files.length], ["Published", counts.published], ["Drafts", counts.draft], ["Storage", formatBytes(used)]].map(([l, v]) => (
            <div key={l} className="card p-4"><p className="text-[11px] uppercase tracking-[0.14em] text-faint">{l}</p><p className="mt-1 font-display text-2xl">{v}</p></div>
          ))}
        </section>

        {projects.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2">
            {([["Recently added", recentAdded, "created_at"], ["Recently updated", recentUpdated, "updated_at"]] as const).map(([title, list, key]) => (
              <div key={title} className="card p-4">
                <h2 className="mb-3 text-xs uppercase tracking-[0.14em] text-faint">{title}</h2>
                <ul className="space-y-1">
                  {list.map((p) => (
                    <li key={p.id}><button className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-raised" onClick={() => setEditor({ project: p })}>
                      <span className="truncate">{p.name}</span><span className="shrink-0 text-xs text-faint">{formatDate(p[key])}</span></button></li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <div className="flex gap-1 border-b border-line" role="tablist">
          {(["projects", "files"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cx("-mb-px min-h-11 border-b-2 px-4 text-sm capitalize", tab === t ? "border-accent text-text" : "border-transparent text-muted hover:text-text")}>
              {t} <span className="ml-1 text-faint">{t === "projects" ? projects.length : files.length}</span>
            </button>
          ))}
        </div>

        {tab === "files" ? (
          <FileManager files={files} projects={projects} ownerId={data.profile.id} query={q} />
        ) : (
          <section className="space-y-4" aria-label="Projects">
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {(["all", "published", "draft", "archived"] as const).map((v) => (
                <button key={v} className="chip" aria-pressed={vis === v} onClick={() => setVis(v)}>
                  {v === "all" ? "All" : VIS_LABEL[v]} <span className="ml-1.5 text-faint">{v === "all" ? projects.length : counts[v]}</span>
                </button>
              ))}
            </div>

            {projects.length === 0 ? (
              <div className="card flex flex-col items-center gap-4 p-10 text-center">
                <p className="font-display text-2xl">Your collection starts here.</p>
                <p className="max-w-sm text-sm text-muted">Add your first app, game or experiment. It stays private until you publish it.</p>
                <button className="btn btn-primary" onClick={() => setEditor({ project: null })}>＋ Add new innovation</button>
              </div>
            ) : shown.length === 0 ? <p className="card p-8 text-center text-sm text-muted">No projects match.</p> : (
              <ul className="space-y-3">
                {shown.map((p) => {
                  const t = thumbOf(p);
                  return (
                    <li key={p.id} className={cx("card flex flex-col gap-4 p-3 sm:flex-row sm:items-center sm:p-4", busy === p.id && "opacity-60")}>
                      <button className="h-36 w-full shrink-0 overflow-hidden rounded-lg bg-raised sm:h-16 sm:w-28" onClick={() => setEditor({ project: p })} aria-label={`Edit ${p.name}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {t ? <img src={t} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center font-display text-2xl text-accent/60">{p.name.slice(0, 1)}</span>}
                      </button>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-display text-lg">{p.name}</h3>
                          <span className={cx("rounded-full border px-2 py-0.5 text-[11px]", VIS_STYLE[p.visibility])}>{VIS_LABEL[p.visibility]}</span>
                          {p.is_featured && <span className="text-[11px] text-accent">★ Featured</span>}
                        </div>
                        <p className="text-xs text-faint">{p.category} · {STATUS_LABEL[p.status]} · Updated {formatDate(p.updated_at)}</p>
                        {p.technologies.length > 0 && <div className="flex flex-wrap gap-1">{p.technologies.slice(0, 6).map((x) => <span key={x} className="tag">{x}</span>)}</div>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditor({ project: p })}>Edit</button>
                        {p.visibility === "published" ? (
                          <>
                            <a className="btn btn-ghost btn-sm" href={`/?p=${p.slug}`} target="_blank" rel="noopener">View ↗</a>
                            <button className="btn btn-ghost btn-sm" onClick={() => setVisibility(p, "draft")}>Unpublish</button>
                          </>
                        ) : p.visibility === "draft" ? (
                          <button className="btn btn-primary btn-sm" onClick={() => setVisibility(p, "published")}>Publish</button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => setVisibility(p, "draft")}>Restore</button>
                        )}
                        {p.visibility !== "archived" && <button className="btn btn-ghost btn-sm" onClick={() => setVisibility(p, "archived")}>Archive</button>}
                        <button className="btn btn-danger btn-sm" onClick={() => { setDel(p); setDelFiles(false); }}>Delete</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </main>

      {editor && <ProjectEditor key={editor.project?.id ?? "new"} ownerId={data.profile.id} project={editor.project} files={files} releases={data.releases} thumbs={data.thumbs} categories={categories} onClose={() => setEditor(null)} />}
      {settings && <SettingsPanel data={data} onClose={() => setSettings(false)} />}

      {del && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-labelledby="dp-t">
          <div className="card w-full max-w-md space-y-4 p-6">
            <h3 id="dp-t" className="font-display text-xl">Delete “{del.name}”?</h3>
            <p className="text-sm text-muted">The project page, its release notes and its public link will be removed. If you only want it off the showcase, use Unpublish or Archive instead.</p>
            {delCount > 0 && (
              <fieldset className="space-y-2 rounded-lg border border-line p-3 text-sm">
                <legend className="px-1 text-xs text-faint">{delCount} attached file{delCount === 1 ? "" : "s"} · {formatBytes(delBytes)}</legend>
                <label className="flex gap-2"><input type="radio" name="df" checked={!delFiles} onChange={() => setDelFiles(false)} /> <span>Keep the files in my file library <span className="text-faint">(recommended)</span></span></label>
                <label className="flex gap-2"><input type="radio" name="df" checked={delFiles} onChange={() => setDelFiles(true)} /> <span className="text-danger">Also delete the files permanently — cannot be undone</span></label>
              </fieldset>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
