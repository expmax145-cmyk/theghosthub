"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ghost Hub cinematic intro (about 10.6 s, skippable, shown once per browser session).
 *   Act I   The Watchers  : twelve+ pairs of faceted crimson eyes ignite one by one, with heartbeat thuds.
 *   Act II  The Emergence : a crimson flash, then the sculpted bat bodies appear around the eyes.
 *   Act III The Swarm     : the bats rush toward the viewer and the screen fades into the site.
 * All sound is synthesised with the Web Audio API (no audio files). Browsers only allow sound after a tap,
 * so a gate screen asks first.
 */

const KEY = "ghosthub-intro-seen";
const ACT1_END = 4.6;
const ACT2_END = 7.4;
const ACT3_END = 10.6;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInQuart = (t: number) => t * t * t * t;

type Bat = {
  id: number; x: number; y: number; z: number; tilt: number; wakeTime: number; poseStyle: number; diveAngle: number;
  flapPhase: number; flapFreq: number; flapAmp: number; pulse: number;
};

// x, y, depth, tilt, wakeTime, poseStyle (0 swept-up, 1 broad glide, 2 deep beat), diveAngle
const CONFIG: Array<[number, number, number, number, number, number, number]> = [
  [0.5, 0.43, 1.15, 0, 0.15, 1, 0],
  [0.26, 0.32, 0.92, -0.14, 1.05, 0, -0.35],
  [0.74, 0.3, 0.95, 0.14, 1.75, 0, 0.35],
  [0.35, 0.63, 0.88, 0.09, 2.3, 2, -0.22],
  [0.66, 0.65, 0.9, -0.09, 2.75, 2, 0.22],
  [0.14, 0.48, 0.74, 0.16, 3.1, 1, -0.55],
  [0.86, 0.46, 0.76, -0.16, 3.38, 1, 0.55],
  [0.38, 0.16, 0.68, -0.11, 3.6, 0, -0.18],
  [0.62, 0.15, 0.68, 0.11, 3.78, 0, 0.18],
  [0.5, 0.8, 0.78, 0, 3.94, 2, 0.05],
  [0.18, 0.78, 0.62, 0.12, 4.08, 1, -0.45],
  [0.82, 0.79, 0.64, -0.12, 4.2, 1, 0.45],
  [0.5, 0.24, 0.6, 0.04, 4.3, 0, -0.08],
];
const SWARM: Bat[] = CONFIG.map(([x, y, z, tilt, wakeTime, poseStyle, diveAngle], id) => ({
  id, x, y, z, tilt, wakeTime, poseStyle, diveAngle,
  flapPhase: id * 1.45, flapFreq: 4.8 + (id % 3) * 0.55, flapAmp: 0.85, pulse: 0,
}));

const DUST = Array.from({ length: 65 }, () => ({
  x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, r: 0.8 + Math.random() * 2.2,
  vx: (Math.random() - 0.5) * 0.015, vy: -0.008 - Math.random() * 0.02, phase: Math.random() * Math.PI * 2,
}));

/* ------------------------------------------------------------------ audio */
type Audio = { setMuted: (m: boolean) => void; stop: () => void };

function startAudio(muted: boolean): Audio | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.85;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.05;

  const size = ctx.sampleRate * 3;
  const noiseBuf = ctx.createBuffer(1, size, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < size; i++) nd[i] = Math.random() * 2 - 1;
  const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };

  // Sub-bass drone through Acts I and II.
  {
    const osc = ctx.createOscillator(), sub = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(41.2, t0);
    osc.frequency.linearRampToValueAtTime(36.7, t0 + ACT2_END);
    sub.type = "sine";
    sub.frequency.setValueAtTime(55, t0);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(110, t0);
    filter.frequency.exponentialRampToValueAtTime(280, t0 + ACT2_END);
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.32, t0 + 1.2);
    gain.gain.setValueAtTime(0.32, t0 + ACT2_END);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + ACT3_END);
    osc.connect(filter); sub.connect(filter); filter.connect(gain); gain.connect(master);
    osc.start(t0); sub.start(t0); osc.stop(t0 + ACT3_END + 0.2); sub.stop(t0 + ACT3_END + 0.2);
  }

  // Act I: a heartbeat thud and a glassy ping for every pair of eyes.
  SWARM.forEach((w, idx) => {
    const at = t0 + w.wakeTime;
    const kick = ctx.createOscillator(), kg = ctx.createGain();
    kick.type = "sine";
    kick.frequency.setValueAtTime(115 - idx * 3, at);
    kick.frequency.exponentialRampToValueAtTime(28, at + 0.35);
    kg.gain.setValueAtTime(0.001, at);
    kg.gain.exponentialRampToValueAtTime(0.45, at + 0.015);
    kg.gain.exponentialRampToValueAtTime(0.001, at + 0.45);
    kick.connect(kg).connect(master);
    kick.start(at); kick.stop(at + 0.5);

    const ping = ctx.createOscillator(), pg = ctx.createGain();
    ping.type = "triangle";
    const base = 220 * Math.pow(1.06, idx);
    ping.frequency.setValueAtTime(base, at);
    ping.frequency.exponentialRampToValueAtTime(base * 1.5, at + 0.25);
    pg.gain.setValueAtTime(0.001, at);
    pg.gain.exponentialRampToValueAtTime(0.07, at + 0.02);
    pg.gain.exponentialRampToValueAtTime(0.001, at + 0.4);
    ping.connect(pg).connect(master);
    ping.start(at); ping.stop(at + 0.45);
  });

  // Act II: crack of thunder and a dark chord swell.
  {
    const at = t0 + ACT1_END;
    const n = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(900, at);
    bp.frequency.exponentialRampToValueAtTime(140, at + 1.8);
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, at);
    g.gain.exponentialRampToValueAtTime(0.85, at + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, at + 2.4);
    n.connect(bp).connect(g).connect(master);
    n.start(at); n.stop(at + 2.5);
    [73.42, 110.0, 146.83, 174.61].forEach((freq) => {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), cg = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = freq;
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(180, at);
      lp.frequency.exponentialRampToValueAtTime(1200, at + 1.4);
      cg.gain.setValueAtTime(0.001, at);
      cg.gain.exponentialRampToValueAtTime(0.12, at + 0.8);
      cg.gain.exponentialRampToValueAtTime(0.001, at + 2.7);
      o.connect(lp).connect(cg).connect(master);
      o.start(at); o.stop(at + 2.8);
    });
  }

  // Act III: wing-flutter rush and echolocation chirps.
  {
    const at = t0 + ACT2_END;
    const n = noise();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(320, at);
    f.frequency.exponentialRampToValueAtTime(2400, at + 2.2);
    f.frequency.exponentialRampToValueAtTime(600, at + 3.1);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(11, at);
    lfo.frequency.linearRampToValueAtTime(18, at + 2.5);
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.42;
    const mod = ctx.createGain();
    mod.gain.value = 0.5;
    lfo.connect(lfoGain).connect(mod.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, at);
    env.gain.exponentialRampToValueAtTime(0.95, at + 1.8);
    env.gain.exponentialRampToValueAtTime(0.001, at + 3.1);
    n.connect(f).connect(mod).connect(env).connect(master);
    n.start(at); lfo.start(at); n.stop(at + 3.2); lfo.stop(at + 3.2);
    for (let i = 0; i < 10; i++) {
      const ct = at + 0.35 + i * 0.22;
      const c = ctx.createOscillator(), cg = ctx.createGain();
      c.type = "sine";
      c.frequency.setValueAtTime(4800 + (i % 3) * 650, ct);
      c.frequency.exponentialRampToValueAtTime(2600, ct + 0.12);
      cg.gain.setValueAtTime(0.001, ct);
      cg.gain.exponentialRampToValueAtTime(0.032, ct + 0.015);
      cg.gain.exponentialRampToValueAtTime(0.001, ct + 0.14);
      c.connect(cg).connect(master);
      c.start(ct); c.stop(ct + 0.16);
    }
  }

  return {
    setMuted: (m) => master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.05),
    stop: () => {
      try {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
        window.setTimeout(() => void ctx.close().catch(() => {}), 300);
      } catch { /* already closed */ }
    },
  };
}

/* ---------------------------------------------------------------- drawing */
function drawAtmosphere(c: CanvasRenderingContext2D, W: number, H: number, t: number, act2: number, flash: number) {
  c.fillStyle = "#020203";
  c.fillRect(0, 0, W, H);
  if (act2 > 0) {
    const cx = W * 0.5, cy = H * 0.42, r = Math.max(W, H) * 0.72;
    const g = c.createRadialGradient(cx, cy, r * 0.04, cx, cy, r);
    g.addColorStop(0, `rgba(145,12,22,${0.34 * act2})`);
    g.addColorStop(0.45, `rgba(14,22,48,${0.3 * act2})`); // a little dark blue between the reds
    g.addColorStop(1, "rgba(2,2,3,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  if (flash > 0.005) { c.fillStyle = `rgba(210,25,35,${0.24 * flash})`; c.fillRect(0, 0, W, H); }
  for (const m of DUST) {
    const px = (((m.x + m.vx * t + Math.sin(t * 0.6 + m.phase) * 0.01) % 1) + 1) % 1;
    const py = (((m.y + m.vy * t) % 1) + 1) % 1;
    const a = (0.15 + 0.35 * act2) * (0.5 + 0.5 * Math.sin(t * 2.5 + m.phase));
    c.beginPath();
    c.arc(px * W, py * H, m.r * m.z, 0, Math.PI * 2);
    c.fillStyle = `rgba(255,42,50,${a})`;
    c.fill();
  }
}

// Sharp, faceted, pupil-less crimson eyes.
function drawEyes(c: CanvasRenderingContext2D, open: number, glow: number, pulse: number) {
  if (open <= 0.01) return;
  c.save();
  c.scale(1, Math.max(0.02, open));
  const bloom = (18 + 22 * pulse) * glow;
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    const shape = () => {
      c.beginPath();
      c.moveTo(0.24, -0.09);
      c.lineTo(0.055, -0.025);
      c.lineTo(0.042, 0.035);
      c.quadraticCurveTo(0.155, 0.068, 0.24, -0.09);
      c.closePath();
    };
    c.shadowColor = `rgba(255,16,22,${0.95 * glow})`;
    c.shadowBlur = bloom;
    const g = c.createLinearGradient(0.04, -0.04, 0.24, -0.02);
    g.addColorStop(0, "#ff4d4d");
    g.addColorStop(0.45, "#ff1219");
    g.addColorStop(1, "#c9040b");
    c.fillStyle = g;
    shape();
    c.fill();
    c.shadowBlur = bloom * 0.45;
    c.fillStyle = "rgba(255,65,65,0.65)";
    shape();
    c.fill();
    c.restore();
  }
  c.restore();
}

function drawBat(c: CanvasRenderingContext2D, bat: Bat, t: number, bodyAlpha: number, eyeOpen: number, zoom: number) {
  const cycle = t * Math.PI * 2 * bat.flapFreq + bat.flapPhase;
  const flap = Math.sin(cycle) * bat.flapAmp;
  const lag = Math.sin(cycle - 0.65) * bat.flapAmp;
  c.save();

  if (bodyAlpha > 0.005) {
    c.save();
    c.globalAlpha *= bodyAlpha;
    const rim = "rgba(185,45,58,0.55)";
    const bone = "rgba(95,22,32,0.75)";

    for (const side of [-1, 1]) {
      c.save();
      c.scale(side, 1);
      let sweep = 0;
      if (bat.poseStyle === 0) sweep = -0.35;
      if (bat.poseStyle === 2) sweep = 0.25;
      const sx = 0.24, sy = -0.14;
      const wx = 0.86, wy = -0.52 + sweep * 0.6 - flap * 0.42;
      const tx = 1.78, ty = -0.22 + sweep - lag * 0.88;
      const f1x = 1.48, f1y = 0.28 - lag * 0.62;
      const f2x = 1.14, f2y = 0.44 - flap * 0.48;
      const f3x = 0.76, f3y = 0.54 - flap * 0.3;
      const bx = 0.26, by = 0.48;

      const wg = c.createLinearGradient(sx, sy, tx, ty);
      wg.addColorStop(0, "#09090d");
      wg.addColorStop(0.55, "#0e0a0e");
      wg.addColorStop(1, "#1a090d");
      c.fillStyle = wg;
      c.strokeStyle = rim;
      c.lineWidth = Math.max(0.012, 1.6 / zoom);
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(sx, sy);
      c.quadraticCurveTo(0.55, -0.45 - flap * 0.25, wx, wy);
      c.lineTo(wx + 0.04, wy - 0.08);
      c.lineTo(wx + 0.08, wy + 0.01);
      c.quadraticCurveTo(1.36, wy - 0.18, tx, ty);
      c.quadraticCurveTo(1.56, (ty + f1y) * 0.5 - 0.14, f1x, f1y);
      c.quadraticCurveTo(1.3, (f1y + f2y) * 0.5 - 0.13, f2x, f2y);
      c.quadraticCurveTo(0.95, (f2y + f3y) * 0.5 - 0.12, f3x, f3y);
      c.quadraticCurveTo(0.5, (f3y + by) * 0.5 - 0.1, bx, by);
      c.closePath();
      c.fill();
      c.stroke();

      c.strokeStyle = bone;
      c.lineWidth = Math.max(0.008, 1.1 / zoom);
      c.beginPath();
      c.moveTo(sx, sy); c.lineTo(wx, wy); c.lineTo(tx, ty);
      c.moveTo(wx, wy); c.lineTo(f1x, f1y);
      c.moveTo(wx, wy); c.lineTo(f2x, f2y);
      c.moveTo(wx, wy); c.lineTo(f3x, f3y);
      c.stroke();
      c.restore();
    }

    // Tail membrane.
    c.fillStyle = "#07070b";
    c.strokeStyle = rim;
    c.lineWidth = Math.max(0.012, 1.5 / zoom);
    c.beginPath();
    c.moveTo(-0.26, 0.44); c.lineTo(-0.18, 0.72); c.lineTo(-0.08, 0.66); c.lineTo(0, 0.84);
    c.lineTo(0.08, 0.66); c.lineTo(0.18, 0.72); c.lineTo(0.26, 0.44);
    c.closePath();
    c.fill();
    c.stroke();

    // Torso.
    const tg = c.createRadialGradient(0, 0.05, 0.04, 0, 0.12, 0.45);
    tg.addColorStop(0, "#18141c");
    tg.addColorStop(0.65, "#0b0a0f");
    tg.addColorStop(1, "#050508");
    c.fillStyle = tg;
    c.beginPath();
    c.ellipse(0, 0.14, 0.28, 0.44, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = "rgba(160,45,55,0.28)";
    c.lineWidth = Math.max(0.007, 1.0 / zoom);
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 0.11, 0.06, 0.12, 0.2, Math.PI * 0.85); c.stroke(); }

    // Feet.
    c.fillStyle = "#141118";
    c.strokeStyle = rim;
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 0.13, 0.54, 0.055, 0.075, s * -0.2, 0, Math.PI * 2); c.fill(); c.stroke(); }

    // Head and ears.
    c.fillStyle = "#0c0b10";
    c.beginPath();
    c.arc(0, -0.38, 0.25, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    for (const s of [-1, 1]) {
      c.save();
      c.scale(s, 1);
      c.fillStyle = "#0a090e";
      c.beginPath();
      c.moveTo(0.08, -0.54);
      c.quadraticCurveTo(0.24, -0.78, 0.23, -0.96);
      c.quadraticCurveTo(0.11, -0.82, 0.04, -0.6);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }

    // Snout and fangs.
    c.fillStyle = "#16121a";
    c.beginPath();
    c.ellipse(0, -0.27, 0.11, 0.075, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(235,210,215,0.75)";
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * 0.045, -0.23); c.lineTo(s * 0.06, -0.18); c.lineTo(s * 0.072, -0.23);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  c.save();
  c.translate(0, -0.39);
  drawEyes(c, eyeOpen, 0.85 + 0.15 * Math.sin(t * 14 + bat.id * 2.1), bat.pulse);
  c.restore();
  c.restore();
}

function actName(t: number) {
  return t < ACT1_END ? "Act I • The Watchers" : t < ACT2_END ? "Act II • The Emergence" : "Act III • The Swarm";
}

function runIntro(canvas: HTMLCanvasElement, onAct: (s: string) => void, onEnd: () => void): () => void {
  const c = canvas.getContext("2d");
  if (!c) { onEnd(); return () => {}; }
  let W = 0, H = 0, raf = 0, ended = false, lastAct = "";
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

  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / 1000;
    const label = actName(t);
    if (label !== lastAct) { lastAct = label; onAct(label); }

    c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    const act2 = easeInOutCubic(clamp((t - ACT1_END) / 1.35));
    const fd = t - ACT1_END;
    const flash = fd >= 0 && fd < 0.75 ? Math.exp(-fd * 5.5) * (0.7 + 0.3 * Math.sin(fd * 45)) : 0;
    drawAtmosphere(c, W, H, t, act2, flash);

    const unit = Math.min(W, H) * 0.115;
    const queue = SWARM.map((bat) => ({ bat, dive: clamp((t - (ACT2_END + bat.id * 0.055)) / 2.45) })).sort((a, b) => a.dive - b.dive);

    for (const { bat, dive } of queue) {
      const eyeOpen = easeOutCubic(clamp((t - bat.wakeTime) / 0.22));
      if (eyeOpen <= 0.001) continue;
      const since = t - bat.wakeTime;
      bat.pulse = since >= 0 && since < 0.65 ? Math.exp(-since * 5) : 0;

      const hx = Math.sin(t * 1.4 + bat.id) * 0.008 * act2;
      const hy = Math.cos(t * 1.8 + bat.id * 1.3) * 0.012 * act2;
      const rush = easeInQuart(dive);
      const spread = 1 + rush * 3.1;
      const nx = 0.5 + (bat.x + hx - 0.5) * spread;
      const ny = 0.46 + (bat.y + hy - 0.46) * spread - rush * 0.12;
      const scale = unit * bat.z * (1 + rush * 15.5);
      const bank = bat.tilt * (1 - dive * 0.5) + bat.diveAngle * Math.sin(dive * Math.PI) * 0.85;
      const dyn: Bat = {
        ...bat,
        flapFreq: bat.flapFreq + dive * 3.2,
        flapAmp: lerp(0.18, 1.05, clamp(act2 * 0.45 + dive * 1.4)),
      };

      c.save();
      c.translate(nx * W, ny * H);
      c.rotate(bank);
      c.scale(scale, scale);
      c.globalAlpha = 1 - clamp((dive - 0.86) / 0.14);
      drawBat(c, dyn, t, act2, eyeOpen, scale);
      c.restore();
    }

    const fade = clamp((t - (ACT3_END - 0.65)) / 0.65);
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${fade})`; c.fillRect(0, 0, W, H); }

    if (t >= ACT3_END) { if (!ended) { ended = true; onEnd(); } return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
}

/* -------------------------------------------------------------- component */
function Eyes({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 70" aria-hidden="true">
      <polygon points="18,16 74,30 84,54 64,60 32,52 24,38" fill="#ff1219" />
      <polygon points="182,16 126,30 116,54 136,60 168,52 176,38" fill="#ff1219" />
    </svg>
  );
}

export default function BatIntro() {
  const [show, setShow] = useState(true); // true on the server: black screen, no flash of the site
  const [phase, setPhase] = useState<"gate" | "play">("gate");
  const [fade, setFade] = useState(false);
  const [act, setAct] = useState("Act I • The Watchers");
  const [hasSound, setHasSound] = useState(false);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audio = useRef<Audio | null>(null);
  const stopLoop = useRef<(() => void) | null>(null);

  const finish = useCallback(() => {
    stopLoop.current?.(); stopLoop.current = null;
    audio.current?.stop(); audio.current = null;
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ }
    setFade(true);
    window.setTimeout(() => { document.documentElement.setAttribute("data-intro-seen", "1"); setShow(false); }, 700);
  }, []);

  const start = useCallback((sound: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPhase("play");
    setMuted(false);
    setHasSound(false);
    if (sound) {
      try { audio.current = startAudio(false); setHasSound(audio.current !== null); } catch { audio.current = null; }
    }
    stopLoop.current = runIntro(canvas, setAct, finish);
  }, [finish]);

  const toggleMute = useCallback(() => {
    setMuted((m) => { audio.current?.setMuted(!m); return !m; });
  }, []);

  useEffect(() => {
    let seen = false;
    try { const t = Number(localStorage.getItem(KEY)); seen = t > 0 && Date.now() - t < 14 * 864e5; } catch { /* ignore */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) setShow(false);
    const replay = () => { document.documentElement.removeAttribute("data-intro-seen"); setPhase("gate"); setFade(false); setShow(true); };
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

  useEffect(() => () => { stopLoop.current?.(); audio.current?.stop(); }, []);

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Intro animation" aria-modal="true"
      data-intro="" className={"fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-700" + (fade ? " pointer-events-none" : "")} style={{ opacity: fade ? 0 : 1 }}>
      <noscript><style>{`[role=dialog][aria-label="Intro animation"]{display:none}`}</style></noscript>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />

      {phase === "gate" ? (
        <div className="relative z-20 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <Eyes className="mb-7 h-10 w-24 opacity-90 drop-shadow-[0_0_16px_rgba(255,18,25,0.85)]" />
          <h2 className="whitespace-nowrap font-display text-3xl font-black tracking-[0.24em] text-text drop-shadow-[0_0_35px_rgba(255,18,25,0.3)] sm:text-6xl">GHOST HUB</h2>
          <p className="mt-3 text-xs uppercase tracking-[0.42em] text-faint sm:text-sm">In the dark, something watches</p>
          <div className="mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
            <button className="btn btn-primary min-h-12 w-full px-9 text-sm uppercase tracking-[0.25em] sm:w-auto" onClick={() => start(true)} autoFocus>Enter the darkness</button>
            <button className="btn btn-ghost min-h-12 w-full px-6 text-xs uppercase tracking-[0.2em] sm:w-auto" onClick={() => start(false)}>Silent mode</button>
          </div>
          <p className="mt-6 max-w-sm text-[11px] leading-relaxed text-faint">Contains sudden flashes of light and sound. Choose Silent mode or Bypass if you are sensitive to either.</p>
          <button className="mt-3 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-faint transition-colors hover:text-muted" onClick={finish}>Bypass sequence</button>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-6 py-6 sm:px-10">
          <span className="text-[11px] uppercase tracking-[0.3em] text-accent/80" aria-live="polite">{act}</span>
          <div className="flex items-center gap-3">
            {hasSound && (
              <button className="btn btn-ghost btn-sm" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>{muted ? "Sound off" : "Sound on"}</button>
            )}
            <button className="btn btn-ghost btn-sm uppercase tracking-[0.25em]" onClick={finish}>Skip &rsaquo;</button>
          </div>
        </div>
      )}
    </div>
  );
}
