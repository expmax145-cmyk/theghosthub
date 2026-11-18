"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { goTo, surpriseHref, usePaletteProjects } from "@/lib/palette";
import { applyTheme, currentTheme } from "@/lib/theme";
import { categoryColor } from "@/lib/kind";

type Item = { id: string; label: string; hint: string; group: string; run: () => void; tint?: string };

/** Ctrl/Cmd+K: jump to any page or project, or flip the theme. */
export default function CommandPalette() {
  const router = useRouter();
  const projects = usePaletteProjects();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    const o = () => setOpen(true);
    window.addEventListener("keydown", k);
    window.addEventListener("ghosthub:palette", o);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("ghosthub:palette", o); };
  }, []);

  useEffect(() => {
    if (open) { opener.current = document.activeElement as HTMLElement; setQ(""); setSel(0); setTimeout(() => input.current?.focus(), 0); document.documentElement.style.overflow = "hidden"; }
    else { document.documentElement.style.overflow = ""; opener.current?.focus?.(); }
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  const go = (href: string) => { setOpen(false); if (href.startsWith("/go/") || href.startsWith("http")) location.assign(href); else router.push(href); };
  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      { id: "home", label: "Home", hint: "Browse everything", group: "Go to", run: () => go("/") },
      { id: "explore", label: "Explore the orbit map", hint: "Planets and rings", group: "Go to", run: () => go("/explore") },
      { id: "arcade", label: "Play Wisp Catch", hint: "Arcade game", group: "Go to", run: () => go("/arcade") },
      { id: "about", label: "About", hint: "Who made this", group: "Go to", run: () => go("/about") },
      { id: "contact", label: "Contact", hint: "Say hello", group: "Go to", run: () => go("/contact") },
      { id: "studio", label: "Creator sign in", hint: "Studio", group: "Go to", run: () => go("/studio") },
      { id: "surprise", label: "Surprise me", hint: "Open a random creation", group: "Actions", run: () => { const h = surpriseHref(); setOpen(false); if (h) goTo(h); } },
      { id: "party", label: "Wisp party", hint: "Try ↑ ↑ ↓ ↓ ← → ← → B A", group: "Actions", run: () => { setOpen(false); setTimeout(() => window.dispatchEvent(new Event("ghosthub:party")), 150); } },
      { id: "theme", label: "Toggle light / dark theme", hint: "Appearance", group: "Actions", run: () => { applyTheme(currentTheme() === "dark" ? "light" : "dark"); setOpen(false); } },
      { id: "intro", label: "Replay intro animation", hint: "Wisp says hi", group: "Actions", run: () => { setOpen(false); try { sessionStorage.removeItem("ghosthub-intro-v2"); } catch { /* blocked */ } if (location.pathname === "/") window.dispatchEvent(new Event("ghosthub:intro")); else location.assign("/"); } },
    ];
    const proj: Item[] = projects.map((p) => ({ id: "p-" + p.href, label: p.name, hint: p.hint, group: "Creations", tint: categoryColor(p.category), run: () => go(p.href) }));
    const needle = q.trim().toLowerCase();
    const all = [...proj, ...base];
    return needle ? all.filter((i) => (i.label + " " + i.hint).toLowerCase().includes(needle)) : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, q]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);

  if (!open) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); items[sel]?.run(); }
    else if (e.key === "Tab") { e.preventDefault(); input.current?.focus(); }
  };
  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[250] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }} onKeyDown={onKey}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="palette-in w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creations, pages, actions…" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[sel] ? `pal-${sel}` : undefined} className="h-14 w-full bg-transparent text-[15px] text-text outline-none placeholder:text-faint" />
          <kbd className="kbd shrink-0">Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" ref={list} className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Nothing found. Wisp looked everywhere.</li>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? it.group : ""; lastGroup = it.group;
            return (
              <li key={it.id} role="presentation">
                {head && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{head}</p>}
                <button type="button" id={`pal-${i}`} role="option" aria-selected={i === sel} data-i={i} tabIndex={-1} onMouseMove={() => setSel(i)} onClick={it.run}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === sel ? "bg-raised text-text" : "text-muted"}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.tint ?? "var(--color-accent)" }} aria-hidden="true" />
                  <span className="flex-1 truncate font-medium">{it.label}</span>
                  <span className="truncate text-xs text-faint">{it.hint}</span>
                  {i === sel && <kbd className="kbd">↵</kbd>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
