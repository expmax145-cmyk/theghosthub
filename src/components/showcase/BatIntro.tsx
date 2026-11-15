"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ghost Hub intro: found-footage in a haunted bat cave (about 10.6 s, skippable, remembered for 14 days).
 *   00 The Cave : a shaky handheld camera walks into the dark; only a flashlight beam shows the rock.
 *   01 The Roost: the beam slides over the ceiling and catches bat shadows, shapes and glinting red eyes.
 *   02 The Rush : the colony wakes, screeches, and the bats burst past the lens while the phone shakes.
 * Sound is synthesised with the Web Audio API (no audio files). Phones that support it also vibrate.
 * Browsers only allow sound/vibration after a tap, so a gate screen asks first.
 */

const KEY = "ghosthub-intro-seen";
const T_ROOST = 2.8;
const T_RUSH = 6.4;
const T_END = 10.6;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
const easeIn3 = (t: number) => { const x = clamp(t); return x * x * x; };

function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Roost = { x: number; y: number; s: number; wake: number; launch: number; dur: number; tx: number; ty: number; ph: number; eyes: boolean };
const R = rng(11);
const ROOST: Roost[] = Array.from({ length: 20 }, (_, i) => ({
  x: 0.05 + R() * 0.9,
  y: 0.03 + R() * 0.3,
  s: 0.6 + R() * 0.75,
  wake: T_ROOST + 0.5 + R() * 2.6,
  launch: T_RUSH + (i / 20) * 1.9 + R() * 0.25,
  dur: 1.5 + R() * 0.8,
  tx: 0.5 + (R() - 0.5) * 1.5,
  ty: 0.5 + (R() - 0.5) * 1.1,
  ph: R() * 6.28,
  eyes: R() < 0.75,
}));

// Times of camera jerks (seconds) and their strength.
const JERKS: Array<[number, number]> = [[3.4, 0.6], [4.6, 0.5], [5.8, 0.8], [6.4, 2.2], [7.6, 1.4], [8.6, 1.6], [9.5, 2]];
// Light flicker dips (kept below 3 per second for photosensitive viewers).
const DIPS = [5.1, 6.4, 7.9, 9.0];
// Hand-held vibration cues: [time, pattern].
const VIBES: Array<[number, number | number[]]> = [
  ...Array.from({ length: 9 }, (_, i): [number, number] => [0.5 + i * 0.62, 14]),
  [3.4, 30], [4.6, 30], [5.8, 45],
  [6.4, [70, 30, 70, 30, 150]],
  ...Array.from({ length: 12 }, (_, i): [number, number[]] => [6.9 + i * 0.3, [35, 25, 35]]),
  [10.0, 180],
];

/* ------------------------------------------------------------------ audio */
type Audio = { setMuted: (m: boolean) => void; stop: () => void };

function startAudio(muted: boolean): Audio | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);
  const t0 = ctx.currentTime + 0.05;

  // Cave reverb: a decaying noise impulse.
  const conv = ctx.createConvolver();
  {
    const len = Math.floor(ctx.sampleRate * 2.4);
    const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = imp.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    conv.buffer = imp;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    conv.connect(wet).connect(master);
  }
  const send = (node: AudioNode, dry: number, wet: number, pan = 0) => {
    let out: AudioNode = node;
    if (pan !== 0 && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); out = p; }
    if (dry > 0) { const g = ctx.createGain(); g.gain.value = dry; out.connect(g).connect(master); }
    if (wet > 0) { const g = ctx.createGain(); g.gain.value = wet; out.connect(g).connect(conv); }
  };

  const size = ctx.sampleRate * 3;
  const noiseBuf = ctx.createBuffer(1, size, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < size; i++) nd[i] = Math.random() * 2 - 1;
  const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
  const burst = (at: number, dur: number, type: BiquadFilterType, freq: number, gain: number, dry = 1, wet = 0, pan = 0) => {
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    n.connect(f).connect(g);
    send(g, dry, wet, pan);
    n.start(at, Math.random() * 2); n.stop(at + dur + 0.05);
  };
  const thump = (at: number, f0: number, f1: number, gain: number, dur: number) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    send(g, 1, 0.1);
    o.start(at); o.stop(at + dur + 0.05);
  };

  // Bat screech: a rasping, falling-then-rising sweep with fast vibrato, plus airy noise.
  const screech = (at: number, dur: number, f0: number, f1: number, gain: number, pan: number, wet = 0.5) => {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur * 0.55);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.8, at + dur);
    lfo.frequency.value = 44 + Math.random() * 20;
    lg.gain.value = f0 * 0.07;
    lfo.connect(lg).connect(o.frequency);
    bp.type = "bandpass"; bp.frequency.value = (f0 + f1) / 2; bp.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(bp).connect(g);
    send(g, 1, wet, pan);
    o.start(at); lfo.start(at); o.stop(at + dur + 0.05); lfo.stop(at + dur + 0.05);
    burst(at, dur * 0.8, "highpass", 4200, gain * 0.5, 1, wet, pan);
  };

  // Ambience: low rumble with a slowly moving cave wind, and a rising sub drone.
  {
    const n = noise(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    lp.type = "lowpass"; lp.frequency.value = 240;
    lfo.frequency.value = 0.18; lg.gain.value = 90; lfo.connect(lg).connect(lp.frequency);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.3, t0 + 1.2);
    g.gain.setValueAtTime(0.3, t0 + T_END - 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + T_END - 0.1);
    n.connect(lp).connect(g); send(g, 1, 0.15);
    n.start(t0); lfo.start(t0); n.stop(t0 + T_END); lfo.stop(t0 + T_END);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(46, t0); o.frequency.linearRampToValueAtTime(38, t0 + T_RUSH);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.22, t0 + 3);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + T_END - 0.1);
    o.connect(og); send(og, 1, 0);
    o.start(t0); o.stop(t0 + T_END);
  }

  // Footsteps on gravel, then running; breathing; water drips.
  for (let i = 0; i < 9; i++) { const at = t0 + 0.5 + i * 0.62; thump(at, 95, 45, 0.22, 0.14); burst(at, 0.1, "bandpass", 1800, 0.05, 1, 0.2, i % 2 ? 0.2 : -0.2); }
  for (let i = 0; i < 13; i++) { const at = t0 + 6.5 + i * 0.3; thump(at, 110, 40, 0.35, 0.12); burst(at, 0.09, "bandpass", 2200, 0.08, 1, 0.3, i % 2 ? 0.3 : -0.3); }
  for (let i = 0; i < 6; i++) burst(t0 + 0.9 + i * 1.9, 0.7, "bandpass", 900, 0.05 + i * 0.012, 1, 0.1);
  for (let i = 0; i < 6; i++) burst(t0 + 7.0 + i * 0.55, 0.3, "bandpass", 1100, 0.12, 1, 0.1);
  [1.1, 2.3, 3.9, 5.2].forEach((d, i) => {
    const at = t0 + d, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(1500, at); o.frequency.exponentialRampToValueAtTime(800, at + 0.09);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.1, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g); send(g, 0.6, 1, i % 2 ? 0.5 : -0.5); o.start(at); o.stop(at + 0.2);
  });

  // Heartbeat that quickens: lub-dub pairs.
  {
    let at = 3.0, gap = 0.95;
    while (at < T_END - 0.4) {
      thump(t0 + at, 70, 36, 0.5, 0.2);
      thump(t0 + at + 0.17, 62, 34, 0.34, 0.2);
      gap = at < T_RUSH ? Math.max(0.5, gap - 0.07) : 0.36;
      at += gap;
    }
  }

  // The roost wakes: distant screeches first, then the colony.
  screech(t0 + 3.4, 0.45, 2600, 4300, 0.13, -0.6, 0.9);
  screech(t0 + 4.1, 0.4, 3100, 5200, 0.17, 0.5, 0.8);
  screech(t0 + 4.9, 0.5, 2300, 4100, 0.22, -0.2, 0.7);
  screech(t0 + 5.6, 0.45, 3300, 5600, 0.26, 0.7, 0.6);
  screech(t0 + 5.75, 0.35, 2800, 4700, 0.22, -0.8, 0.6);
  thump(t0 + T_RUSH, 95, 26, 0.85, 0.9);
  burst(t0 + T_RUSH, 0.6, "lowpass", 1400, 0.7, 1, 0.5);
  screech(t0 + T_RUSH, 0.7, 2000, 4400, 0.5, -0.1, 0.5);
  screech(t0 + T_RUSH + 0.12, 0.6, 3300, 6200, 0.45, 0.4, 0.5);
  for (let i = 0; i < 22; i++) {
    const at = t0 + T_RUSH + 0.4 + i * 0.17 + Math.random() * 0.08;
    if (at > t0 + T_END - 0.6) break;
    const f0 = 2300 + Math.random() * 2000;
    screech(at, 0.22 + Math.random() * 0.3, f0, f0 * (1.5 + Math.random() * 0.7), 0.2 + Math.random() * 0.16, Math.random() * 2 - 1, 0.45);
  }

  // Wing flutter of the swarm.
  {
    const at = t0 + T_RUSH + 0.3, n = noise(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain(), mod = ctx.createGain(), env = ctx.createGain();
    f.type = "bandpass"; f.Q.value = 1.4;
    f.frequency.setValueAtTime(400, at); f.frequency.exponentialRampToValueAtTime(2600, at + 2.8); f.frequency.exponentialRampToValueAtTime(900, at + 3.8);
    lfo.frequency.setValueAtTime(12, at); lfo.frequency.linearRampToValueAtTime(20, at + 3);
    lg.gain.value = 0.42; mod.gain.value = 0.5; lfo.connect(lg).connect(mod.gain);
    env.gain.setValueAtTime(0.0001, at); env.gain.exponentialRampToValueAtTime(1, at + 2.6); env.gain.exponentialRampToValueAtTime(0.0001, at + 3.8);
    n.connect(f).connect(mod).connect(env); send(env, 1, 0.3);
    n.start(at); lfo.start(at); n.stop(at + 3.9); lfo.stop(at + 3.9);
  }

  master.gain.setValueAtTime(muted ? 0 : 0.9, t0 + T_END - 0.5);
  master.gain.linearRampToValueAtTime(0, t0 + T_END);
  return {
    setMuted: (m) => master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05),
    stop: () => {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
        window.setTimeout(() => void ctx.close().catch(() => {}), 300);
      } catch { /* already closed */ }
    },
  };
}

/* ---------------------------------------------------------------- drawing */
type Layers = { back: HTMLCanvasElement; mid: HTMLCanvasElement; near: HTMLCanvasElement; grain: HTMLCanvasElement };

function makeLayer(W: number, H: number) { const c = document.createElement("canvas"); c.width = Math.round(W); c.height = Math.round(H); return c; }

function buildLayers(W: number, H: number): Layers {
  const r = rng(5);
  const back = makeLayer(W, H), bc = back.getContext("2d")!;
  const bg = bc.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1a1716"); bg.addColorStop(0.5, "#2a2523"); bg.addColorStop(1, "#171413");
  bc.fillStyle = bg; bc.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) {
    const x = r() * W, y = r() * H, rad = 8 + r() * 60;
    bc.fillStyle = r() < 0.5 ? `rgba(255,240,225,${0.012 + r() * 0.035})` : `rgba(0,0,0,${0.05 + r() * 0.12})`;
    bc.beginPath(); bc.ellipse(x, y, rad, rad * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2); bc.fill();
  }
  bc.strokeStyle = "rgba(0,0,0,0.5)";
  for (let i = 0; i < 70; i++) {
    bc.lineWidth = 0.6 + r() * 1.8; bc.beginPath();
    let x = r() * W, y = r() * H; bc.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 70; y += (r() - 0.35) * 60; bc.lineTo(x, y); }
    bc.stroke();
  }

  const mid = makeLayer(W, H), mc = mid.getContext("2d")!;
  mc.fillStyle = "#0b0909";
  for (let x = -20; x < W + 40; x += 18 + r() * 40) {
    const h = H * (0.05 + r() * 0.2), w = 14 + r() * 40;
    mc.beginPath(); mc.moveTo(x, -4); mc.lineTo(x + w, -4); mc.lineTo(x + w * (0.35 + r() * 0.3), h); mc.closePath(); mc.fill();
    mc.strokeStyle = "rgba(120,100,95,0.18)"; mc.lineWidth = 1; mc.beginPath(); mc.moveTo(x + w, -4); mc.lineTo(x + w * 0.5, h); mc.stroke();
  }
  for (const side of [0, 1]) {
    mc.beginPath(); mc.moveTo(side ? W : 0, 0);
    for (let y = 0; y <= H; y += H / 9) mc.lineTo(side ? W - (0.05 + r() * 0.12) * W : (0.05 + r() * 0.12) * W, y);
    mc.lineTo(side ? W : 0, H); mc.closePath(); mc.fill();
  }
  mc.beginPath(); mc.moveTo(0, H);
  for (let x = 0; x <= W; x += W / 12) mc.lineTo(x, H * (0.9 + r() * 0.08));
  mc.lineTo(W, H); mc.closePath(); mc.fill();

  const near = makeLayer(W, H), nc = near.getContext("2d")!;
  nc.fillStyle = "#030202";
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
    nc.beginPath(); nc.moveTo(cx, cy);
    const sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1;
    nc.lineTo(cx + sx * W * (0.22 + r() * 0.12), cy);
    for (let k = 1; k <= 4; k++) nc.lineTo(cx + sx * W * (0.2 - k * 0.04 + r() * 0.06), cy + sy * H * (k * 0.06 + r() * 0.04));
    nc.lineTo(cx, cy + sy * H * 0.3); nc.closePath(); nc.fill();
  }

  const grain = makeLayer(128, 128), gc = grain.getContext("2d")!;
  const gi = gc.createImageData(128, 128);
  for (let i = 0; i < gi.data.length; i += 4) { const v = Math.random() * 255; gi.data[i] = gi.data[i + 1] = gi.data[i + 2] = v; gi.data[i + 3] = 28; }
  gc.putImageData(gi, 0, 0);
  return { back, mid, near, grain };
}

/** A bat hanging by its feet: folded wings make a dark teardrop; head and ears point down. */
function drawHanging(c: CanvasRenderingContext2D, u: number, open: number, shiver: number, lit: number, eyes: boolean) {
  c.save();
  c.rotate(shiver);
  const rim = `rgba(190,60,70,${0.12 + 0.5 * lit})`;
  c.fillStyle = "#030204"; c.strokeStyle = rim; c.lineWidth = Math.min(2.2, Math.max(0.8, u * 0.025)); c.lineJoin = "round";
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1);
    c.beginPath();
    c.moveTo(0.08 * u, 0.1 * u);
    c.quadraticCurveTo((0.5 + open * 1.1) * u, (0.5 - open * 0.3) * u, (0.38 + open * 1.2) * u, (1.5 - open * 0.7) * u);
    c.quadraticCurveTo(0.2 * u, 1.75 * u, 0.05 * u, 1.4 * u);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  c.beginPath(); c.ellipse(0, 0.85 * u, 0.36 * u, 0.78 * u, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(0, 1.78 * u, 0.24 * u, 0, Math.PI * 2); c.fill(); c.stroke();
  for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 0.1 * u, 1.9 * u); c.lineTo(side * 0.27 * u, 2.4 * u); c.lineTo(side * 0.2 * u, 1.85 * u); c.closePath(); c.fill(); }
  c.beginPath(); c.moveTo(-0.14 * u, 0.12 * u); c.lineTo(-0.1 * u, -0.1 * u); c.moveTo(0.14 * u, 0.12 * u); c.lineTo(0.1 * u, -0.1 * u); c.stroke();
  if (eyes && lit > 0.22) {
    c.shadowColor = "rgba(255,20,25,0.95)"; c.shadowBlur = 10; c.fillStyle = `rgba(255,40,45,${clamp(lit * 1.6)})`;
    for (const side of [-1, 1]) { c.beginPath(); c.ellipse(side * 0.1 * u, 1.76 * u, Math.max(1.1, u * 0.05), Math.max(0.8, u * 0.032), 0, 0, Math.PI * 2); c.fill(); }
    c.shadowBlur = 0;
  }
  c.restore();
}

/** A bat in flight, seen from the front: two scalloped wings, small body, ears. */
function drawFlying(c: CanvasRenderingContext2D, u: number, flap: number, lit: number, eyes: boolean) {
  c.save();
  c.fillStyle = "#020102"; c.strokeStyle = `rgba(190,60,70,${0.1 + 0.5 * lit})`; c.lineWidth = Math.min(2.2, Math.max(0.8, u * 0.012)); c.lineJoin = "round";
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1);
    c.beginPath();
    c.moveTo(0.18 * u, -0.1 * u);
    c.quadraticCurveTo(0.6 * u, (-0.5 - flap * 0.35) * u, 1.0 * u, (-0.55 - flap * 0.5) * u);
    c.lineTo(1.9 * u, (-0.05 - flap * 0.9) * u);
    c.quadraticCurveTo(1.6 * u, (0.15 - flap * 0.5) * u, 1.45 * u, (0.38 - flap * 0.5) * u);
    c.quadraticCurveTo(1.15 * u, (0.2 - flap * 0.35) * u, 0.95 * u, (0.45 - flap * 0.3) * u);
    c.quadraticCurveTo(0.65 * u, (0.3 - flap * 0.2) * u, 0.4 * u, 0.55 * u);
    c.lineTo(0.18 * u, 0.45 * u);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  c.beginPath(); c.ellipse(0, 0.15 * u, 0.22 * u, 0.42 * u, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(0, -0.36 * u, 0.18 * u, 0, Math.PI * 2); c.fill(); c.stroke();
  for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 0.06 * u, -0.5 * u); c.lineTo(side * 0.2 * u, -0.8 * u); c.lineTo(side * 0.17 * u, -0.46 * u); c.closePath(); c.fill(); }
  if (eyes && lit > 0.15) {
    c.shadowColor = "rgba(255,20,25,0.95)"; c.shadowBlur = 12; c.fillStyle = "rgba(255,45,50,0.95)";
    for (const side of [-1, 1]) { c.beginPath(); c.ellipse(side * 0.07 * u, -0.37 * u, Math.max(1.2, u * 0.045), Math.max(0.9, u * 0.03), 0, 0, Math.PI * 2); c.fill(); }
    c.shadowBlur = 0;
  }
  c.restore();
}

const actName = (t: number) => (t < T_ROOST ? "00 • The Cave" : t < T_RUSH ? "01 • The Roost" : "02 • The Rush");

function runIntro(canvas: HTMLCanvasElement, onAct: (s: string) => void, onEnd: () => void, vibrate: boolean): () => void {
  const c = canvas.getContext("2d");
  if (!c) { onEnd(); return () => {}; }
  let W = 0, H = 0, raf = 0, ended = false, lastAct = "", vi = 0, layers: Layers | null = null;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    layers = buildLayers(W, H);
  };
  resize();
  window.addEventListener("resize", resize);
  const canVib = vibrate && typeof navigator.vibrate === "function";

  const jerkAt = (t: number) => { let v = 0; for (const [e, m] of JERKS) { const d = t - e; if (d >= 0 && d < 0.6) v += Math.exp(-d * 8) * Math.sin(d * 60) * m; } return v; };
  const dipAt = (t: number) => { let v = 0; for (const e of DIPS) { const d = t - e; if (d >= 0 && d < 0.5) v = Math.max(v, Math.exp(-d * 9)); } return v; };
  const lerpKey = (t: number, keys: Array<[number, number]>) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
    return keys[keys.length - 1][1];
  };

  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / 1000;
    const label = actName(t);
    if (label !== lastAct) { lastAct = label; onAct(label); }
    while (canVib && vi < VIBES.length && VIBES[vi][0] <= t) { try { navigator.vibrate(VIBES[vi][1]); } catch { /* unsupported */ } vi++; }
    if (!layers) return;

    const rushAmt = smooth((t - T_RUSH) / 0.7);
    const amp = 0.55 + 0.45 * smooth((t - 2) / 1.5) + 2.2 * rushAmt;
    const j = jerkAt(t);
    const dx = (Math.sin(t * 6.7) + 0.6 * Math.sin(t * 11.3 + 1)) * amp * W * 0.0042 + j * W * 0.012;
    const dy = Math.abs(Math.sin(t * 3.3)) * amp * H * 0.005 + Math.sin(t * 8.9 + 2) * amp * H * 0.0026 + Math.cos(t * 55) * j * H * 0.01;
    const rot = Math.sin(t * 4.1 + 0.5) * amp * 0.0055 + j * 0.018;
    const forward = 1 - Math.pow(1 - clamp(t / 5.6), 2);

    c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    c.fillStyle = "#000"; c.fillRect(0, 0, W, H);

    // Flashlight: where it points, how strong it is.
    const dip = dipAt(t);
    const I = (0.9 + 0.1 * Math.sin(t * 17)) * (1 - 0.55 * dip) * (1 + 0.25 * rushAmt);
    const lx = W * lerpKey(t, [[0, 0.5], [1.8, 0.56], [3.0, 0.3], [4.2, 0.72], [5.4, 0.42], [6.2, 0.5], [10, 0.5]]) - dx * 1.4 + Math.sin(t * 2.3) * W * 0.015;
    const ly = H * lerpKey(t, [[0, 0.64], [1.8, 0.6], [3.0, 0.3], [4.2, 0.24], [5.4, 0.3], [6.2, 0.42], [10, 0.46]]) - dy * 1.4;
    const lr = Math.max(W, H) * 0.58 * I;
    const litAt = (px: number, py: number) => clamp(1 - Math.hypot(px - lx, py - ly) / (lr * 0.75));

    c.save();
    c.translate(W / 2 + dx, H / 2 + dy); c.rotate(rot); c.scale(1.12, 1.12); c.translate(-W / 2, -H / 2);

    const zoomed = (k: number, draw: () => void) => {
      const sc = 1 + forward * k;
      c.save(); c.translate(W / 2, H * 0.46); c.scale(sc, sc); c.translate(-W / 2, -H * 0.46); draw(); c.restore();
    };
    zoomed(0.22, () => c.drawImage(layers!.back, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1));

    const unit = Math.min(W, H) * 0.07 * (W < 520 ? 1.15 : 1);
    const midScale = 1 + forward * 0.45;
    const midPos = (nx: number, ny: number): [number, number] => [W / 2 + (nx * W - W / 2) * midScale, H * 0.46 + (ny * H - H * 0.46) * midScale];

    zoomed(0.45, () => c.drawImage(layers!.mid, 0, 0, W, H));

    // Roosting bats (hanging) and bats that have taken off.
    const flying: Array<{ r: Roost; f: number }> = [];
    for (const b of ROOST) {
      const f = (t - b.launch) / b.dur;
      if (f >= 1) continue;
      if (f >= 0) { flying.push({ r: b, f }); continue; }
      if (t < T_ROOST - 0.2) continue;
      const [px, py] = midPos(b.x, b.y);
      const wake = clamp((t - b.wake) / 1.4);
      const startled = clamp((t - (T_RUSH - 0.3)) / 0.3);
      const shiver = wake > 0 ? Math.sin(t * 38 + b.ph) * 0.05 * (0.4 + wake + startled) : 0;
      const lit = litAt(px, py + unit * b.s * 1.2);
      c.save(); c.translate(px, py); drawHanging(c, unit * b.s * midScale * 0.9, clamp(wake * 0.25 + startled * 0.9), shiver, lit, b.eyes); c.restore();
    }
    flying.sort((a, b) => a.f - b.f);
    for (const { r: b, f } of flying) {
      const e = easeIn3(f);
      const [sx, sy] = midPos(b.x, b.y + 0.05);
      const px = lerp(sx, b.tx * W, smooth(f) * 0.9 + e * 0.1) + Math.sin(t * 9 + b.ph) * unit * 0.4 * (1 - f);
      const py = lerp(sy, b.ty * H, smooth(f) * 0.9 + e * 0.1);
      const sc = unit * b.s * 0.9 * (1 + e * 17);
      const flap = Math.sin(t * Math.PI * 2 * (5.5 + (b.ph % 2)) + b.ph) * 0.95;
      // Soft shadow on the rock behind the bat.
      c.save(); c.globalAlpha = 0.28 * (1 - f); c.translate(px + sc * 0.5, py + sc * 0.4); c.rotate(Math.sin(b.ph) * 0.4); drawFlying(c, sc * 1.5, flap * 0.7, 0, false); c.restore();
      c.save(); c.translate(px, py); c.rotate(Math.sin(t * 3 + b.ph) * 0.22 + (px / W - 0.5) * 0.5 * e); drawFlying(c, sc, flap, litAt(px, py), b.eyes); c.restore();
    }
    zoomed(1.1, () => { c.globalAlpha = 0.95; c.drawImage(layers!.near, 0, 0, W, H); });
    c.restore();

    // Darkness with a flashlight hole, a touch of cold light and a hint of midnight blue.
    const dark = c.createRadialGradient(lx, ly, 0, lx, ly, lr);
    dark.addColorStop(0, "rgba(0,0,0,0)"); dark.addColorStop(0.25, "rgba(0,0,0,0.06)"); dark.addColorStop(0.6, "rgba(0,0,0,0.6)"); dark.addColorStop(1, "rgba(0,0,0,0.97)");
    c.fillStyle = dark; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "lighter";
    const cold = c.createRadialGradient(lx, ly, 0, lx, ly, lr * 0.9);
    cold.addColorStop(0, `rgba(150,170,205,${0.13 * I})`); cold.addColorStop(1, "rgba(150,170,205,0)");
    c.fillStyle = cold; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "rgba(6,12,32,0.16)"; c.fillRect(0, 0, W, H);

    // Camera look: grain, vignette, HUD.
    const gp = c.createPattern(layers.grain, "repeat");
    if (gp) { c.save(); c.translate(Math.random() * 128, Math.random() * 128); c.fillStyle = gp; c.fillRect(-128, -128, W + 256, H + 256); c.restore(); }
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const fs = clamp(Math.min(W, H) * 0.032, 11, 15);
    c.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`; c.textBaseline = "top";
    const hx = W * 0.05 + dx * 0.4, hy = H * 0.04 + dy * 0.4;
    if (Math.floor(t * 1.6) % 2 === 0) { c.fillStyle = "#ff2b33"; c.beginPath(); c.arc(hx + fs * 0.45, hy + fs * 0.55, fs * 0.42, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "rgba(240,233,223,0.82)";
    c.fillText("REC", hx + fs * 1.3, hy); c.fillText("CAM 01", hx, hy + fs * 1.5);
    const sec = Math.floor(t), fr = Math.floor((t % 1) * 25);
    c.textAlign = "right"; c.fillText(`00:00:${String(sec).padStart(2, "0")}:${String(fr).padStart(2, "0")}`, W - hx, H * 0.04 + dy * 0.4);
    c.fillText(`BAT ${t < T_RUSH ? "▮▮▮" : "▮▯▯"}`, W - hx, hy + fs * 1.5);
    c.textAlign = "left";

    // Fade in from black at the start; cut to black at the end.
    const fin = 1 - clamp(t / 0.6), fout = clamp((t - (T_END - 0.7)) / 0.7);
    const black = Math.max(fin, fout);
    if (black > 0) { c.fillStyle = `rgba(0,0,0,${black})`; c.fillRect(0, 0, W, H); }

    if (t >= T_END) { if (!ended) { ended = true; onEnd(); } return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); if (canVib) { try { navigator.vibrate(0); } catch { /* ignore */ } } };
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
  const [act, setAct] = useState("00 • The Cave");
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
    stopLoop.current = runIntro(canvas, setAct, finish, true);
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
          <p className="mt-6 max-w-sm text-[11px] leading-relaxed text-faint">Contains a shaking camera, sudden dark-and-light changes, loud screeches and phone vibration. Choose Silent mode or Bypass if you are sensitive to any of these.</p>
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
