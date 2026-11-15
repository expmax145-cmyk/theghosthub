"use client";
// Shared helpers for the haunted-cave layer: preferences, achievements, ambient sound and haptics.
// Everything is opt-in and best-effort; each function is safe to call when storage or audio is unavailable.

const SOUND_KEY = "ghosthub-sound";
const LIGHTS_KEY = "ghosthub-lights";
const ACH_KEY = "ghosthub-ach";

export const ACHIEVEMENTS: Record<string, { title: string; hint: string }> = {
  cellar: { title: "Found the cellar", hint: "Tap the eyes in the logo five times." },
  swarm: { title: "Woke the bats", hint: "Disturb the sleeper in the footer." },
  depth: { title: "Reached the bottom", hint: "Scroll all the way down the showcase." },
  lights: { title: "Lit the torch", hint: "Switch the lights on in the header." },
};

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

export const soundOn = () => read(SOUND_KEY) === "1";
export const lightsOn = () => read(LIGHTS_KEY) === "1";

export function setLights(on: boolean) {
  write(LIGHTS_KEY, on ? "1" : "0");
  if (on) document.documentElement.setAttribute("data-lights", "1");
  else document.documentElement.removeAttribute("data-lights");
  if (on) unlock("lights");
}

export function getUnlocked(): string[] {
  try { return JSON.parse(read(ACH_KEY) ?? "[]"); } catch { return []; }
}

export function unlock(id: string) {
  if (!ACHIEVEMENTS[id]) return;
  const have = getUnlocked();
  if (have.includes(id)) return;
  write(ACH_KEY, JSON.stringify([...have, id]));
  window.dispatchEvent(new CustomEvent("ghost-ach", { detail: ACHIEVEMENTS[id].title }));
}

/* ---------- audio ---------- */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let stopAmb: (() => void) | null = null;

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return ctx;
}

export function startAmbience() {
  const c = audio();
  if (!c || !master || stopAmb) return;
  void c.resume();
  const bus = c.createGain();
  bus.gain.value = 0;
  bus.gain.linearRampToValueAtTime(1, c.currentTime + 2);
  const low = c.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 180;
  low.connect(bus);
  bus.connect(master);
  const oscs = [55, 82.4, 110.7].map((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.035 / (i + 1);
    o.connect(g).connect(low);
    o.start();
    return o;
  });
  // A slow wobble so the drone breathes.
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 40;
  lfo.connect(lfoGain).connect(low.frequency);
  lfo.start();

  let timer = 0;
  const drip = () => {
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1500 + Math.random() * 700, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.4);
    timer = window.setTimeout(drip, 2200 + Math.random() * 5000);
  };
  timer = window.setTimeout(drip, 1500);

  stopAmb = () => {
    window.clearTimeout(timer);
    const t = c.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0, t + 0.6);
    window.setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); bus.disconnect(); }, 700);
    stopAmb = null;
  };
}

export function stopAmbience() { stopAmb?.(); }

export function setSound(on: boolean) {
  write(SOUND_KEY, on ? "1" : "0");
  if (on) startAmbience(); else stopAmbience();
  window.dispatchEvent(new Event("ghost-sound-change"));
}

/** A short synthesized bat screech. Only audible when the visitor has switched sound on. */
export function screech() {
  if (!soundOn()) return;
  const c = audio();
  if (!c || !master) return;
  void c.resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const vib = c.createOscillator();
  const vg = c.createGain();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(1700, t);
  o.frequency.exponentialRampToValueAtTime(3300, t + 0.28);
  vib.frequency.value = 38;
  vg.gain.value = 140;
  vib.connect(vg).connect(o.frequency);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1100;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(hp).connect(g).connect(master);
  o.start(t); vib.start(t);
  o.stop(t + 0.45); vib.stop(t + 0.45);
}

/** Vibration shares the sound switch, so one control covers every sensory effect. */
export function haptic(pattern: number | number[]) {
  if (!soundOn()) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
