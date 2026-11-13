"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Opening sequence (≈9.5 s, skippable, shown once per browser session):
 *   1. one bat opens its blood-red eyes, then the others one by one (only eyes are visible),
 *   2. one second after the last pair opens, the bodies appear,
 *   3. all bats fly toward the viewer and the screen goes black before the site shows.
 * Sound is synthesised with the Web Audio API (no files): six counting tones with shrinking
 * gaps ("1...... 2.... 3...4..5.6"), a low swell at the reveal, then wing flutter and chirps.
 * Browsers only allow sound after a tap, so a gate screen asks first.
 */

const KEY = "ghosthub-intro-seen";

// Seconds at which each bat opens its eyes. The first six coincide with the six counting tones.
const OPEN = [0, 1.4, 2.4, 3.0, 3.45, 3.7, 3.85, 4.0, 4.15, 4.3, 4.45, 4.6];
const TONES = OPEN.slice(0, 6);
const FREQ = [82.41, 98.0, 116.54, 138.59, 164.81, 196.0];
const EYE_DUR = 0.12;
const T_BODY = OPEN[OPEN.length - 1] + EYE_DUR + 1.0; // one second after the last eyes open
const BODY_DUR = 0.9;
const T_FLY = T_BODY + BODY_DUR + 0.25;
const FLY_DUR = 1.5;
const STAG = 0.08;
const END = T_FLY + (OPEN.length - 1) * STAG + FLY_DUR + 0.3;

// x, y (0..1 of the screen), size, tilt (radians)
const BATS: Array<[number, number, number, number]> = [
  [0.5, 0.4, 1.0, 0], [0.22, 0.3, 0.8, -0.12], [0.78, 0.27, 0.85, 0.1], [0.34, 0.64, 0.9, 0.08],
  [0.68, 0.66, 0.95, -0.08], [0.12, 0.54, 0.7, 0.14], [0.88, 0.52, 0.75, -0.14], [0.5, 0.84, 0.7, 0],
  [0.3, 0.12, 0.6, -0.1], [0.7, 0.1, 0.6, 0.1], [0.18, 0.84, 0.6, 0.1], [0.83, 0.85, 0.6, -0.1],
];

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/* ------------------------------------------------------------------ audio */
function startAudio(): { stop: () => void } | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.08;

  const len = ctx.sampleRate * 2;
  const noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; return s; };

  // Six counting tones: dark saw + tritone + sub + a thin ping so each one reads as a "count".
  TONES.forEach((t, k) => {
    const at = t0 + t;
    const vol = 0.3 + k * 0.04;
    const layers: Array<[number, OscillatorType, number]> = [[1, "sawtooth", 0.5], [1.4142, "square", 0.1], [0.5, "sine", 0.95], [4, "sine", 0.05]];
    for (const [mult, type, g] of layers) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = FREQ[k] * mult;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700 + k * 150;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, at);
      gn.gain.exponentialRampToValueAtTime(vol * g, at + 0.015);
      gn.gain.exponentialRampToValueAtTime(0.0001, at + (k < 5 ? 0.9 : 1.5));
      o.connect(lp).connect(gn).connect(master);
      o.start(at);
      o.stop(at + 1.6);
    }
  });

  // Low swell when the bodies appear.
  {
    const at = t0 + T_BODY - 0.2;
    const n = noiseSrc();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.7, at + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2.0);
    n.connect(lp).connect(g).connect(master);
    n.start(at);
    n.stop(at + 2.1);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 55;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, at);
    og.gain.exponentialRampToValueAtTime(0.5, at + 0.8);
    og.gain.exponentialRampToValueAtTime(0.0001, at + 2.0);
    o.connect(og).connect(master);
    o.start(at);
    o.stop(at + 2.1);
  }

  // Wing flutter that rises as the bats approach, plus a chirp per bat.
  {
    const at = t0 + T_FLY;
    const n = noiseSrc();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(450, at);
    bp.frequency.exponentialRampToValueAtTime(2600, at + 2.4);
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 12;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.45;
    lfo.connect(lfoDepth).connect(am.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.9, at + 1.9);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 2.7);
    n.connect(bp).connect(am).connect(env).connect(master);
    n.start(at);
    lfo.start(at);
    n.stop(at + 2.8);
    lfo.stop(at + 2.8);
    for (let i = 0; i < OPEN.length; i++) {
      const ct = at + i * STAG;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(5400 - i * 90, ct);
      o.frequency.exponentialRampToValueAtTime(3200, ct + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ct);
      g.gain.exponentialRampToValueAtTime(0.035, ct + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ct + 0.16);
      o.connect(g).connect(master);
      o.start(ct);
      o.stop(ct + 0.2);
    }
  }

  return {
    stop: () => {
      try {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
        window.setTimeout(() => void ctx.close().catch(() => {}), 600);
      } catch { /* already closed */ }
    },
  };
}

/* ---------------------------------------------------------------- drawing */
function wingPath(c: CanvasRenderingContext2D, f: number) {
  // Right wing in bat-local units (wingspan ±1.65). f: -1 (down) … 1 (up). The left wing is mirrored.
  const tipY = -0.15 - 0.75 * f;
  c.beginPath();
  c.moveTo(0.28, -0.2);
  c.quadraticCurveTo(0.9, -0.78 - 0.5 * f, 1.65, tipY);
  c.quadraticCurveTo(1.38, tipY + 0.5, 1.22, 0.36 - 0.55 * f);
  c.quadraticCurveTo(0.98, 0.18 - 0.3 * f, 0.82, 0.62 - 0.4 * f);
  c.quadraticCurveTo(0.56, 0.42, 0.28, 0.58);
  c.closePath();
}

function drawEye(c: CanvasRenderingContext2D, x: number, open: number, side: number, blur: number, flick: number) {
  if (open <= 0.01) return;
  c.save();
  c.translate(x, -0.56);
  c.rotate(side * 0.3); // angry slant: inner corners lower
  c.scale(1, Math.max(open, 0.03));
  c.shadowColor = `rgba(255,24,24,${Math.min(1, 0.95 * flick)})`;
  c.shadowBlur = blur * flick;
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 0.11);
  g.addColorStop(0, "#ff7561");
  g.addColorStop(0.5, "#e3141c");
  g.addColorStop(1, "#7a0006");
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, 0, 0.11, 0.058, 0, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  c.fillStyle = "#060000";
  c.beginPath();
  c.ellipse(0, 0, 0.017, 0.055, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function runIntro(canvas: HTMLCanvasElement, onEnd: () => void): () => void {
  const c = canvas.getContext("2d");
  if (!c) { onEnd(); return () => {}; }
  let W = 0, H = 0, raf = 0, ended = false;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const draw = (t: number) => {
    c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    const bodyA = clamp((t - T_BODY) / BODY_DUR);
    if (bodyA > 0) { // faint cold moonlight once the bodies exist
      const g = c.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7);
      g.addColorStop(0, `rgba(16,34,72,${0.55 * bodyA})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    // A red breath of light on every counting tone.
    let pulse = 0;
    TONES.forEach((tt) => { const d = t - tt; if (d >= 0 && d < 0.6) pulse = Math.max(pulse, Math.exp(-d * 7)); });
    if (pulse > 0.01) { c.fillStyle = `rgba(110,0,6,${0.14 * pulse})`; c.fillRect(0, 0, W, H); }

    const u = Math.min(W * 0.1, H * 0.12);
    const order = BATS.map((_, i) => ({ i, p: clamp((t - (T_FLY + i * STAG)) / FLY_DUR) })).sort((a, b) => a.p - b.p);

    for (const { i, p } of order) {
      const [bx, by, size, tilt] = BATS[i];
      const open = clamp((t - OPEN[i]) / EYE_DUR);
      if (open <= 0) continue;
      const e = p * p * p;
      const spread = 1 + e * 2.6;
      const x = W / 2 + (bx * W - W / 2) * spread;
      const y = H / 2 + (by * H - H / 2) * spread;
      const s = u * size * (1 + e * 16);
      const amp = 0.16 + 0.84 * clamp(p * 5);
      const flap = Math.sin(t * Math.PI * 2 * 6 + i * 1.7) * amp;
      const flick = 1 + Math.sin(t * 38 + i * 2.3) * 0.07 + (1 - open) * 0.8;

      c.save();
      c.translate(x, y);
      c.rotate(tilt * (1 - p));
      c.scale(s, s);
      if (bodyA > 0) {
        c.globalAlpha = bodyA;
        c.fillStyle = "#050509";
        c.strokeStyle = "rgba(78,104,168,0.6)";
        c.lineWidth = 2 / s;
        c.lineJoin = "round";
        for (const sx of [1, -1]) { c.save(); c.scale(sx, 1); wingPath(c, flap); c.fill(); c.stroke(); c.restore(); }
        c.beginPath(); c.ellipse(0, 0.12, 0.3, 0.55, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.arc(0, -0.55, 0.26, 0, Math.PI * 2); c.fill(); c.stroke();
        for (const sx of [1, -1]) {
          c.beginPath(); c.moveTo(sx * 0.2, -0.72); c.lineTo(sx * 0.27, -1.08); c.lineTo(sx * 0.04, -0.8); c.closePath(); c.fill(); c.stroke();
        }
        c.globalAlpha = 1;
      }
      const blur = 10 + Math.min(40, s * 0.22);
      drawEye(c, -0.1, open, 1, blur, flick);
      drawEye(c, 0.1, open, -1, blur, flick);
      c.restore();
    }

    const k = clamp((t - (END - 0.55)) / 0.5); // swallow the screen in black at the very end
    if (k > 0) { c.fillStyle = `rgba(0,0,0,${k})`; c.fillRect(0, 0, W, H); }
  };

  const t0 = performance.now();
  const frame = (now: number) => {
    const t = (now - t0) / 1000;
    draw(t);
    if (t >= END) { if (!ended) { ended = true; onEnd(); } return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
}

/* -------------------------------------------------------------- component */
export default function BatIntro() {
  const [show, setShow] = useState(true); // true on the server: black screen, no flash of the site
  const [phase, setPhase] = useState<"gate" | "play">("gate");
  const [fade, setFade] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopAudio = useRef<(() => void) | null>(null);
  const stopLoop = useRef<(() => void) | null>(null);

  const finish = useCallback(() => {
    stopLoop.current?.(); stopLoop.current = null;
    stopAudio.current?.(); stopAudio.current = null;
    try { sessionStorage.setItem(KEY, "1"); } catch { /* private mode */ }
    setFade(true);
    window.setTimeout(() => setShow(false), 650);
  }, []);

  const start = useCallback((sound: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPhase("play");
    if (sound) { try { stopAudio.current = startAudio()?.stop ?? null; } catch { stopAudio.current = null; } }
    stopLoop.current = runIntro(canvas, finish);
  }, [finish]);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; } catch { /* ignore */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const deepLink = new URLSearchParams(window.location.search).has("p");
    if (seen || reduce || deepLink) setShow(false);
    const replay = () => { setPhase("gate"); setFade(false); setShow(true); };
    window.addEventListener("ghost-intro-replay", replay);
    return () => window.removeEventListener("ghost-intro-replay", replay);
  }, []);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [show, finish]);

  useEffect(() => () => { stopLoop.current?.(); stopAudio.current?.(); }, []);

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Intro animation" aria-modal="true"
      className="fixed inset-0 z-[100] bg-black transition-opacity duration-[650ms]" style={{ opacity: fade ? 0 : 1 }}>
      <noscript><style>{`.ghost-intro-gate{display:none}[role=dialog][aria-label="Intro animation"]{display:none}`}</style></noscript>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      {phase === "gate" ? (
        <div className="ghost-intro-gate absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 text-center">
          <div>
            <p className="font-display text-4xl tracking-[0.3em] text-text sm:text-6xl">GHOST HUB</p>
            <p className="mt-3 text-xs uppercase tracking-[0.35em] text-faint">something is watching</p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button className="btn btn-primary min-h-12 text-base" onClick={() => start(true)} autoFocus>Awaken</button>
            <button className="btn btn-ghost" onClick={() => start(false)}>Awaken without sound</button>
          </div>
          <button className="text-xs text-faint underline-offset-4 hover:text-muted hover:underline" onClick={finish}>Skip intro</button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm absolute bottom-5 right-5 border-line/80 text-muted" onClick={finish}>Skip ›</button>
      )}
    </div>
  );
}
