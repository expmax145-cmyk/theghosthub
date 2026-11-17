"use client";
export default function ReplayIntro() {
  return (
    <button type="button" className="text-left hover:text-text" onClick={() => {
      try { sessionStorage.removeItem("ghosthub-intro-v2"); } catch { /* storage blocked */ }
      if (location.pathname === "/") window.dispatchEvent(new Event("ghosthub:intro")); else location.assign("/");
    }}>Replay intro ✦</button>
  );
}
