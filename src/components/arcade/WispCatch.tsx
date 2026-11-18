"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GHOST_PATH } from "@/components/site/Logo";
import { blip } from "@/lib/sound";

const W = 640, H = 400, BEST = "ghosthub-arcade-best";
type Kind = "orb" | "gold" | "bug" | "heart";
type Item = { x: number; y: number; vy: number; k: Kind; r: number; ph: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string };
type Pop = { x: number; y: number; t: number; s: string; c: string };

const readBest = () => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } };

/** Wisp Catch: slide Wisp to catch glowing orbs, dodge the red bugs. */
export default function WispCatch() {
  const cvs = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"idle" | "play" | "pause" | "over">("idle");
  const [final, setFinal] = useState({ score: 0, best: 0, level: 1, fresh: false });
  const g = useRef({
    phase: "idle" as "idle" | "play" | "pause" | "over",
    x: W / 2, tx: W / 2, vx: 0, items: [] as Item[], sparks: [] as Spark[], pops: [] as Pop[],
    score: 0, lives: 3, combo: 0, level: 1, caught: 0, spawn: 0, shake: 0, flash: 0, t: 0, best: 0, shield: 0,
    stars: Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() })),
    keys: { l: false, r: false },
  });

  const start = useCallback(() => {
    const s = g.current;
    Object.assign(s, { phase: "play", x: W / 2, tx: W / 2, vx: 0, items: [], sparks: [], pops: [], score: 0, lives: 3, combo: 0, level: 1, caught: 0, spawn: 0.4, shake: 0, flash: 0, t: 0, shield: 0 });
    s.best = readBest();
    setPhase("play");
  }, []);
  const pause = useCallback(() => { const s = g.current; if (s.phase === "play") { s.phase = "pause"; setPhase("pause"); } }, []);
  const resume = useCallback(() => { const s = g.current; if (s.phase === "pause") { s.phase = "play"; setPhase("play"); } }, []);

  useEffect(() => {
    const canvas = cvs.current!; const ctx = canvas.getContext("2d")!;
    const s = g.current; s.best = readBest();
    const ghost = new Path2D(GHOST_PATH);
    let raf = 0, last = performance.now();

    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);

    const toX = (cx: number) => { const r = canvas.getBoundingClientRect(); return Math.max(30, Math.min(W - 30, ((cx - r.left) / r.width) * W)); };
    const move = (e: PointerEvent) => { s.tx = toX(e.clientX); };
    const down = (e: PointerEvent) => { s.tx = toX(e.clientX); canvas.setPointerCapture?.(e.pointerId); };
    canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerdown", down);
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") { s.keys.l = true; if (s.phase === "play") e.preventDefault(); }
      else if (k === "arrowright" || k === "d") { s.keys.r = true; if (s.phase === "play") e.preventDefault(); }
      else if (k === "p" || k === "escape") { s.phase === "play" ? pause() : s.phase === "pause" && resume(); }
    };
    const ku = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k === "arrowleft" || k === "a") s.keys.l = false; if (k === "arrowright" || k === "d") s.keys.r = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    const vis = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", vis);

    const burst = (x: number, y: number, c: string, n = 12) => { for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = 40 + Math.random() * 140; s.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.4, c }); } };
    const over = () => {
      s.phase = "over";
      const fresh = s.score > s.best;
      if (fresh) { s.best = s.score; try { localStorage.setItem(BEST, String(s.score)); } catch { /* storage blocked */ } }
      setFinal({ score: s.score, best: s.best, level: s.level, fresh }); setPhase("over");
    };

    const update = (dt: number) => {
      s.t += dt;
      // movement: keys nudge the target, wisp eases toward it
      if (s.keys.l) s.tx = Math.max(30, s.tx - 520 * dt);
      if (s.keys.r) s.tx = Math.min(W - 30, s.tx + 520 * dt);
      const nx = s.x + (s.tx - s.x) * Math.min(1, dt * 14); s.vx = (nx - s.x) / Math.max(dt, 0.001); s.x = nx;
      // spawning
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.22, 0.85 - s.level * 0.06) * (0.7 + Math.random() * 0.6);
        const roll = Math.random(), bugP = Math.min(0.32, 0.14 + s.level * 0.015);
        const k: Kind = roll < bugP ? "bug" : roll < bugP + 0.08 ? "gold" : roll < bugP + 0.1 && s.lives < 3 ? "heart" : "orb";
        s.items.push({ x: 24 + Math.random() * (W - 48), y: -20, vy: 110 + s.level * 16 + Math.random() * 60, k, r: k === "gold" ? 11 : 13, ph: Math.random() * 7 });
      }
      const mult = Math.min(5, 1 + Math.floor(s.combo / 5));
      for (const it of s.items) {
        it.y += it.vy * dt; it.ph += dt * 4;
        const hit = Math.abs(it.x - s.x) < 34 && it.y > H - 78 && it.y < H - 24;
        if (hit) {
          it.y = H + 99;
          if (it.k === "bug") {
            if (s.shield > 0) { s.shield = 0; burst(it.x, it.y - 99, "#7dd3fc", 14); blip(300, 0.08); }
            else { s.lives--; s.combo = 0; s.shake = 0.35; s.flash = 0.3; burst(s.x, H - 50, "#fb7185", 16); blip(160, 0.14, 0.06); s.pops.push({ x: s.x, y: H - 90, t: 0.8, s: "ouch", c: "#fb7185" }); }
          } else if (it.k === "heart") { s.lives = Math.min(3, s.lives + 1); burst(s.x, H - 50, "#fda4af", 14); blip(880, 0.1); s.pops.push({ x: s.x, y: H - 90, t: 0.8, s: "+1 life", c: "#fda4af" }); }
          else {
            const pts = (it.k === "gold" ? 5 : 1) * mult; s.score += pts; s.combo++; s.caught++;
            if (it.k === "gold") s.shield = 1;
            burst(s.x, H - 50, it.k === "gold" ? "#fde68a" : "#5eead4", it.k === "gold" ? 18 : 9);
            s.pops.push({ x: s.x, y: H - 90, t: 0.7, s: `+${pts}`, c: it.k === "gold" ? "#fde68a" : "#99f6e4" });
            blip(520 + Math.min(s.combo, 20) * 28, 0.05);
            if (s.caught % 12 === 0) { s.level++; s.pops.push({ x: W / 2, y: 120, t: 1.2, s: `Level ${s.level}`, c: "#7dd3fc" }); blip(990, 0.16); }
          }
        } else if (it.y > H + 10 && it.k !== "bug" && it.y < H + 90) { if (it.k === "orb" || it.k === "gold") s.combo = 0; it.y = H + 99; }
      }
      s.items = s.items.filter((i) => i.y < H + 60);
      for (const p of s.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; }
      s.sparks = s.sparks.filter((p) => p.life > 0);
      for (const p of s.pops) { p.t -= dt; p.y -= 30 * dt; }
      s.pops = s.pops.filter((p) => p.t > 0);
      s.shake = Math.max(0, s.shake - dt); s.flash = Math.max(0, s.flash - dt);
      if (s.lives <= 0) over();
    };

    const draw = () => {
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * s.shake * 3, (Math.random() - 0.5) * 8 * s.shake * 3);
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#06101c"); bg.addColorStop(1, "#0b2a45");
      ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
      for (const st of s.stars) { if (s.phase === "play") { st.y += st.z * 0.5; if (st.y > H) st.y = 0; } ctx.fillStyle = `rgba(160,220,255,${0.25 + st.z * 0.4})`; ctx.fillRect(st.x, st.y, st.z * 1.8, st.z * 1.8); }
      ctx.fillStyle = "rgba(45,212,207,0.12)"; ctx.fillRect(0, H - 14, W, 14);
      for (const it of s.items) {
        ctx.save(); ctx.translate(it.x, it.y);
        if (it.k === "bug") {
          ctx.fillStyle = "#f43f5e"; ctx.beginPath();
          for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + it.ph * 0.3, r = i % 2 ? it.r - 4 : it.r + 3; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill(); ctx.fillStyle = "#1c0610"; ctx.fillRect(-5, -3, 3, 4); ctx.fillRect(2, -3, 3, 4);
        } else if (it.k === "heart") {
          ctx.fillStyle = "#fda4af"; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♥", 0, 0);
        } else {
          const c = it.k === "gold" ? "253,230,138" : "94,234,212", pulse = 1 + Math.sin(it.ph) * 0.12;
          const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, it.r * 2.2 * pulse);
          gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(0.4, `rgba(${c},0.55)`); gr.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, it.r * 2.2 * pulse, 0, 7); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, it.r * 0.45, 0, 7); ctx.fill();
        }
        ctx.restore();
      }
      for (const p of s.sparks) { ctx.globalAlpha = Math.max(0, p.life * 1.6); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); }
      ctx.globalAlpha = 1;
      // wisp
      ctx.save(); ctx.translate(s.x, H - 52); ctx.rotate(Math.max(-0.35, Math.min(0.35, s.vx / 1400)));
      if (s.shield > 0) { ctx.strokeStyle = "rgba(125,211,252,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 38, 0, 7); ctx.stroke(); }
      ctx.shadowColor = "rgba(77,163,255,0.9)"; ctx.shadowBlur = 18;
      const sc = 48 / 24; ctx.scale(sc, sc); ctx.translate(-12, -12);
      const wg = ctx.createLinearGradient(0, 0, 24, 24); wg.addColorStop(0, "#9ccbff"); wg.addColorStop(0.55, "#5eead4"); wg.addColorStop(1, "#86efac");
      ctx.fillStyle = s.flash > 0 ? "#fecdd3" : wg; ctx.fill(ghost);
      ctx.shadowBlur = 0; ctx.fillStyle = "#06101c";
      const look = Math.max(-0.8, Math.min(0.8, (s.tx - s.x) / 60)); ctx.beginPath(); ctx.arc(9.3 + look, 10.4, 1.4, 0, 7); ctx.arc(14.7 + look, 10.4, 1.4, 0, 7); ctx.fill();
      ctx.restore();
      for (const p of s.pops) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.s, p.x, p.y); }
      ctx.globalAlpha = 1;
      // HUD
      ctx.fillStyle = "#eaf5ff"; ctx.font = "600 18px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillText(`${s.score}`, 14, 28);
      ctx.fillStyle = "#86a3bf"; ctx.font = "12px sans-serif"; ctx.fillText(`Best ${Math.max(s.best, s.score)}  ·  Lv ${s.level}`, 14, 46);
      const mult = Math.min(5, 1 + Math.floor(s.combo / 5));
      if (s.combo > 1) { ctx.fillStyle = "#5eead4"; ctx.fillText(`Combo ${s.combo}  ×${mult}`, 14, 63); }
      ctx.textAlign = "right"; ctx.font = "20px sans-serif";
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < s.lives ? "#fb7185" : "rgba(255,255,255,0.18)"; ctx.fillText("♥", W - 14 - i * 24, 30); }
      ctx.restore();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (s.phase === "play") update(dt);
      else if (s.phase === "idle") { s.x += (W / 2 + Math.sin(now / 700) * 120 - s.x) * 0.08; s.tx = s.x; }
      draw(); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerdown", down); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); document.removeEventListener("visibilitychange", vis); };
  }, [pause, resume]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[#06101c] shadow-xl">
      <canvas ref={cvs} className="block aspect-[8/5] w-full touch-none select-none" role="img" aria-label="Wisp Catch game board. Move the pointer, or use the left and right arrow keys, to slide Wisp." />
      {phase !== "play" && (
        <div className="absolute inset-0 grid place-items-center bg-[#06101c]/70 p-4 text-center backdrop-blur-[2px]">
          <div className="max-w-xs">
            {phase === "idle" && <><h2 className="font-display text-3xl font-bold text-white">Wisp Catch</h2><p className="mt-2 text-sm leading-relaxed text-[#a3bdd6]">Slide to catch the glowing orbs. Dodge the red bugs. Golds give a shield.</p><button className="btn btn-primary mt-5" onClick={start} autoFocus>Play</button></>}
            {phase === "pause" && <><h2 className="font-display text-3xl font-bold text-white">Paused</h2><button className="btn btn-primary mt-5" onClick={resume} autoFocus>Resume</button></>}
            {phase === "over" && <><h2 className="font-display text-3xl font-bold text-white">{final.fresh ? "New best!" : "Game over"}</h2><p className="mt-2 text-sm text-[#a3bdd6]" role="status">Score <strong className="text-white">{final.score}</strong> · Level {final.level} · Best {final.best}</p><button className="btn btn-primary mt-5" onClick={start} autoFocus>Play again</button></>}
          </div>
        </div>
      )}
      {phase === "play" && <button type="button" onClick={pause} className="absolute bottom-2 right-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/20" aria-label="Pause game">Pause</button>}
    </div>
  );
}
