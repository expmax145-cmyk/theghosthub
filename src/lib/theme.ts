export type Theme = "dark" | "light";

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Apply and remember a theme, and tell listeners (the toggle button keeps its icon in sync). */
export function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("ghosthub-theme", next); } catch { /* storage blocked */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0b0c10" : "#f5f6fa");
  window.dispatchEvent(new CustomEvent("ghosthub:theme", { detail: next }));
}
