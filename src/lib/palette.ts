import { useSyncExternalStore } from "react";

export type PaletteProject = { name: string; category: string; href: string; hint: string };

let items: PaletteProject[] = [];
const subs = new Set<() => void>();

/** The home page registers its projects here so the command palette (mounted globally) can search them. */
export function setPaletteProjects(next: PaletteProject[]) {
  items = next;
  subs.forEach((f) => f());
}
export function usePaletteProjects(): PaletteProject[] {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => items, () => items);
}
export const openPalette = () => window.dispatchEvent(new Event("ghosthub:palette"));
