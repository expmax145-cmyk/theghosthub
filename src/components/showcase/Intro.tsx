"use client";
import { useEffect, useRef, useState } from "react";
import { GHOST_PATH, GhostMark } from "@/components/site/Logo";
import { blip } from "@/lib/sound";

const SEEN = "ghosthub-intro-v2";
const DARK = ["#7cb8ff", "#4da3ff", "#2dd4cf", "#4ade80", "#9bd0ff"];
const LIGHT = ["#0b63d1", "#0a8a8f", "#138a52", "#2563eb", "#0c7f93"];

type P = { x: number; y: number; sx: number; sy: number; tx: number; ty: number; a: number; r: number; c: string; vx: number; vy: number };

/** Sample the ghost + wordmark as a cloud of target points. */
function sampleTargets(w: number, h: number, step: number): [number, number][] {
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const g = off.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  const size = Math.min(w * 0.62, h * 0.4, 300);
  const gx = w / 2 - size / 2, gy = h / 2 - size * 0.78;
  g.fillStyle = "#fff";
  g.save(); g.translate(gx, gy); g.scale(size / 24, size / 24); g.fill(new Path2D(GHOST_PATH)); g.restore();
  // eyes punched out
  g.globalCompositeOperation = "destination-out";
  const er = (1.6 / 24) * size;
  for (const ex of [9.3, 14.7]) { g.beginPath(); g.arc(gx + (ex / 24) * size, gy + (10.4 / 24) * size, er, 0, 7); g.fill(); }
  g.globalCompositeOperation = "source-over";
  const fs = Math.max(26, Math.min(w * 0.11, 64));
  g.font = `700 ${fs}px "Bricolage Grotesque Variable", "Inter Variable", system-ui, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("Ghost Hub", w / 2, gy + size + fs * 1.1);
  const d = g.getImageData(0, 0, w, h).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] > 140) pts.push([x, y]);
  return pts;
}

const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];
const AFTER_SNEEZE = ["Bless you. (I said it to myself.)", "Ghost allergies. It's the dust. So much dust.", "Gesundheit. Ghost-undheit.", "Sorry! I was holding that in since 1987."];
const REASSEMBLE = ["Reassembling… found 1 spare sock.", "Reassembling… 2 pieces left over. Probably fine.", "Reassembling… who put my head on backwards?", "Reassembling… please hold your applause."];
const WISP_2 = ["…no screaming? Tough crowd.", "Nobody screamed. I'm crying. Spooky tears.", "That was my best scare. My ONLY scare."];
const WISP_3 = ["Fine. Come in. Wipe your feet. (I have none.)", "Go on in. Don't touch anything. (Touch EVERYTHING.)", "Welcome! I'd shake your hand, but, you know. Ghost."];

// Timeline (ms): swirl in -> tension -> ACHOO -> scatter -> reassemble -> Wisp says hi -> burst into the site.
// Paced so every line can be read: ~2 seconds per caption.
const T_IN = 2400, T_TENSION = 3800, T_SNEEZE = 6400, T_FLY = 8400, T_REFORM = 10200, T_BURST = 16200, T_END = 16900;

export default function Intro() {
  const [run, setRun] = useState(0);        // 0 = not running
  const [gone, setGone] = useState(false);
  const cvs = useRef<HTMLCanvasElement>(null);
  const shake = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLParagraphElement>(null);
  const achoo = useRef<HTMLDivElement>(null);
  const wisp = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLParagraphElement>(null);
  const done = useRef<() => void>(() => {});

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch { /* storage blocked */ }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) { document.documentElement.dataset.introSeen = "1"; setGone(true); }
    else setRun(1);
    const replay = () => { document.documentElement.removeAttribute("data-intro-seen"); setGone(false); setRun((n) => n + 1); window.scrollTo(0, 0); };
    window.addEventListener("ghosthub:intro", replay);
    return () => window.removeEventListener("ghosthub:intro", replay);
  }, []);

  useEffect(() => {
    if (!run) return;
    const canvas = cvs.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) { setGone(true); return; }
    const root = document.documentElement;
    const light = root.dataset.theme === "light";
    const COLORS = light ? LIGHT : DARK;
    root.style.overflow = "hidden";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth), h = Math.round(window.innerHeight);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const mobile = w < 640;
    const targets = sampleTargets(w, h, mobile ? 4 : 3);
    const count = Math.min(targets.length, mobile ? 1400 : 2600);
    for (let i = targets.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [targets[i], targets[j]] = [targets[j], targets[i]]; }
    const R = Math.hypot(w, h) * 0.55;
    const ps: P[] = Array.from({ length: count }, (_, i) => {
      const a = Math.random() * Math.PI * 2, r = R * (0.45 + Math.random() * 0.6);
      const [tx, ty] = targets[i];
      return { x: tx, y: ty, sx: 0, sy: 0, tx, ty, a, r, c: COLORS[(Math.random() * COLORS.length) | 0], vx: 0, vy: 0 };
    });
    // Per-run jokes, so a replay is not the same show twice.
    const afterSneeze = pick(AFTER_SNEEZE), reassemble = pick(REASSEMBLE), wisp2 = pick(WISP_2), wisp3 = pick(WISP_3);
    const lines: [number, string][] = [[10200, "BOO!"], [11500, wisp2], [13900, wisp3]];
    wisp.current?.classList.remove("show"); achoo.current?.classList.remove("go");
    if (cap.current) cap.current.textContent = "";
    if (bubble.current) bubble.current.textContent = "";

    const start = performance.now();
    let raf = 0, finished = false, mx = -999, my = -999, exploded = false, capNow = "", lineIdx = 0, shakeUntil = 0;
    const setCap = (t: string) => { if (t !== capNow && cap.current) { capNow = t; cap.current.textContent = t; if (!/\d+%$/.test(t)) { cap.current.classList.remove("bubble"); void cap.current.offsetWidth; cap.current.classList.add("bubble"); } } };
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const finish = () => {
      if (finished) return; finished = true;
      cancelAnimationFrame(raf);
      try { sessionStorage.setItem(SEEN, "1"); } catch { /* storage blocked */ }
      root.style.overflow = "";
      root.dataset.introSeen = "1";
      setGone(true); setRun(0);
    };
    done.current = finish;
    const move = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("keydown", key);

    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      const fade = t > T_BURST ? Math.max(0, 1 - (t - T_BURST) / (T_END - T_BURST)) : 1;
      canvas.style.opacity = String(fade);

      // Captions + gags, driven by the clock.
      if (t < T_IN) setCap(`Summoning ghost… ${Math.min(99, Math.floor(ease(t / T_IN) * 99))}%`);
      else if (t < T_TENSION) setCap("99%… still 99%…");
      else if (t < 5200) setCap("Wait. Is the ghost about to…?");
      else if (t < T_SNEEZE) setCap("ah… ah…");
      else if (t < T_FLY) setCap(afterSneeze);
      else if (t < T_REFORM) setCap(reassemble);
      else setCap("");
      if (!exploded && t >= T_SNEEZE) {
        exploded = true; shakeUntil = t + 450;
        for (const p of ps) {
          const dx = p.tx - w / 2, dy = p.ty - h * 0.45, len = Math.hypot(dx, dy) || 1, sp = 7 + Math.random() * 15;
          p.vx = (dx / len) * sp + (Math.random() - 0.5) * 6; p.vy = (dy / len) * sp - Math.random() * 5;
        }
        const a = achoo.current; if (a) { a.classList.remove("go"); void a.offsetWidth; a.classList.add("go"); }
        blip(180, 0.25, 0.09);
      }
      if (shake.current) shake.current.classList.toggle("intro-shake", t < shakeUntil);
      if (t >= 9800 && wisp.current && !wisp.current.classList.contains("show")) wisp.current.classList.add("show");
      while (lineIdx < lines.length && t >= lines[lineIdx][0]) {
        const b = bubble.current;
        if (b) { b.textContent = lines[lineIdx][1]; b.classList.remove("bubble"); void b.offsetWidth; b.classList.add("bubble"); }
        blip(lineIdx === 0 ? 620 : 480, 0.08, 0.05);
        lineIdx++;
      }

      for (const p of ps) {
        if (t < T_IN) {
          const k = ease(Math.min(1, t / T_IN));
          const ang = p.a + (1 - k) * 5, rr = p.r * (1 - k);
          p.x = p.tx + Math.cos(ang) * rr * 0.9; p.y = p.ty + Math.sin(ang) * rr * 0.9;
        } else if (t < T_SNEEZE) {
          // tension: calm at first, then the whole ghost trembles harder and harder
          const q = Math.max(0, (t - T_TENSION) / (T_SNEEZE - T_TENSION)), amp = 0.9 + 7 * q * q;
          p.x = p.tx + Math.sin(t / 38 + p.a * 9) * amp; p.y = p.ty + Math.cos(t / 41 + p.a * 7) * amp;
        } else if (t < T_FLY) {
          p.vx *= 0.965; p.vy = p.vy * 0.965 + 0.12; p.x += p.vx; p.y += p.vy;
        } else if (t < T_REFORM) {
          const k = 0.03 + 0.08 * ((t - T_FLY) / (T_REFORM - T_FLY));
          p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
        } else if (t < T_BURST) {
          const jx = Math.sin(t / 260 + p.a * 9) * 0.9, jy = Math.cos(t / 300 + p.a * 7) * 0.9;
          let ox = 0, oy = 0;
          const dx = p.tx - mx, dy = p.ty - my, d2 = dx * dx + dy * dy;
          if (d2 < 6400) { const d = Math.sqrt(d2) || 1, f = (80 - d) / 80; ox = (dx / d) * f * 26; oy = (dy / d) * f * 26; }
          p.x += (p.tx + jx + ox - p.x) * 0.22; p.y += (p.ty + jy + oy - p.y) * 0.22;
        } else {
          const dx = p.tx - w / 2, dy = p.ty - h / 2, len = Math.hypot(dx, dy) || 1;
          p.x += (dx / len) * 14 + (p.vx % 3); p.y += (dy / len) * 14 + (p.vy % 3);
        }
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(p.x, p.y, 2.2, 2.2);
      }
      ctx.globalAlpha = 1;
      if (t >= T_END) { finish(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      finished = true; cancelAnimationFrame(raf); root.style.overflow = "";
      window.removeEventListener("pointermove", move); window.removeEventListener("keydown", key);
    };
  }, [run]);

  if (gone) return null;
  return (
    <div data-intro className="fixed inset-0 z-[300] bg-ink" role="dialog" aria-label="Welcome animation" onClick={() => done.current()}>
      <div ref={shake} className="absolute inset-0">
        <canvas ref={cvs} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      </div>
      <div ref={achoo} className="intro-achoo pointer-events-none absolute inset-x-0 top-[14%] text-center font-display text-5xl font-extrabold uppercase tracking-tight text-accent sm:text-7xl" aria-hidden="true">Achoo!</div>
      <div ref={wisp} className="intro-wisp pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-center gap-2 px-4 sm:bottom-20" aria-hidden="true">
        <p ref={bubble} className="min-h-[2.5rem] w-max max-w-[18rem] rounded-2xl rounded-b-sm border border-line bg-surface/95 px-3.5 py-2 text-center text-[15px] font-medium leading-snug text-text shadow-lg sm:max-w-md sm:text-lg" />
        <GhostMark className="wisp-float h-16 w-16 drop-shadow-[0_10px_24px_rgb(var(--glow-a)/0.5)]" />
      </div>
      <p ref={cap} className="pointer-events-none absolute inset-x-0 bottom-9 px-6 text-center text-base font-semibold text-text sm:text-xl" role="status" aria-live="off" />
      <button type="button" onClick={(e) => { e.stopPropagation(); done.current(); }} className="btn btn-ghost btn-sm absolute right-4 top-4">Skip ›</button>
    </div>
  );
}
