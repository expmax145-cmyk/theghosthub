/**
 * Ghost Hub audio: every sound is synthesised with the Web Audio API (no files, no network).
 * Sound is ON by default and can be switched off with the speaker button; browsers only allow audio
 * after a first tap/click/key, so everything starts on that first interaction.
 */
const KEY = "ghosthub-sound";

type Bus = { ctx: AudioContext; sfx: GainNode; music: GainNode; noise: AudioBuffer };
let bus: Bus | null = null;
let timer = 0;
let nextTime = 0;
let step = 0;

export function soundOn(): boolean {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}

function build(): Bus | null {
  if (bus) return bus;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    const master = ctx.createGain(); master.gain.value = 0.95;
    master.connect(comp).connect(ctx.destination);
    const sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    const music = ctx.createGain(); music.gain.value = 0; music.connect(master);
    // a little sparkle: feedback delay on the music bus
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.27;
    const fb = ctx.createGain(); fb.gain.value = 0.32; const wet = ctx.createGain(); wet.gain.value = 0.28;
    music.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(master);
    const len = ctx.sampleRate; const noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    bus = { ctx, sfx, music, noise };
    return bus;
  } catch { return null; }
}

const live = () => (bus && bus.ctx.state === "running" && soundOn() ? bus : null);
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, slideTo?: number, when = 0, out?: AudioNode) {
  const b = live(); if (!b) return;
  const { ctx } = b, t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? b.sfx); o.start(t); o.stop(t + dur + 0.03);
}
function noiseBurst(dur: number, vol: number, f0: number, f1: number, type: BiquadFilterType = "bandpass", when = 0) {
  const b = live(); if (!b) return;
  const { ctx } = b, t = ctx.currentTime + when;
  const s = ctx.createBufferSource(); s.buffer = b.noise; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(b.sfx); s.start(t); s.stop(t + dur + 0.05);
}

/** Named effects used across the site. */
export const sfx = {
  click: () => { tone(1046, 0.08, "square", 0.09, 1568); tone(2093, 0.05, "sine", 0.06, undefined, 0.02); },
  hover: () => tone(1568, 0.045, "triangle", 0.07),
  open: () => [660, 988, 1318, 1760].forEach((f, i) => tone(f, 0.14, "triangle", 0.12, undefined, i * 0.045)),
  close: () => [1760, 1318, 988, 660].forEach((f, i) => tone(f, 0.12, "triangle", 0.1, undefined, i * 0.04)),
  theme: () => { tone(1568, 0.35, "sine", 0.16); tone(2349, 0.4, "sine", 0.12, undefined, 0.09); tone(3136, 0.45, "sine", 0.08, undefined, 0.18); },
  nav: () => noiseBurst(0.3, 0.14, 500, 4200),
  toTop: () => tone(520, 0.35, "triangle", 0.16, 2100),
  pop: () => tone(880, 0.09, "sine", 0.14, 1760),
  giggle: () => [1175, 1397, 1568, 1397, 1760, 2093].forEach((f, i) => tone(f, 0.08, "square", 0.08, undefined, i * 0.065)),
  boo: () => { tone(330, 0.5, "sawtooth", 0.13, 120); tone(660, 0.4, "square", 0.05, 240); },
  sneeze: () => { noiseBurst(0.45, 0.4, 5000, 400, "bandpass"); tone(900, 0.3, "sawtooth", 0.14, 140, 0.03); },
  achoo: () => { tone(500, 0.12, "square", 0.1, 800); sfx.sneeze(); },
  party: () => { [1046, 1318, 1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.18, "triangle", 0.14, undefined, i * 0.07)); noiseBurst(0.5, 0.12, 6000, 2000, "highpass", 0.4); },
  success: () => [1046, 1318, 1568].forEach((f, i) => tone(f, 0.16, "triangle", 0.14, undefined, i * 0.07)),
  error: () => { tone(300, 0.14, "square", 0.1, 200); tone(220, 0.18, "square", 0.1, 150, 0.12); },
};

/** Generic short blip (kept for the arcade game). */
export function blip(freq = 520, dur = 0.05, vol = 0.04) {
  tone(freq, Math.max(dur, 0.06), "triangle", Math.min(0.3, vol * 3.5), freq * 1.5);
}

/* ---------- Background music: a bright, high-pitched music-box loop (C - Am - F - G) ---------- */
const BPM = 116, STEP = 60 / BPM / 4;                          // one 16th note
const CHORDS = [[72, 76, 79, 84], [69, 72, 76, 81], [69, 72, 77, 81], [71, 74, 79, 83]];
const BASS = [48, 45, 41, 43];
const ARP = [0, 1, 2, 3, 2, 3, 1, 2];                           // eighth notes per bar
// melody: [bar, step in bar, midi, length in steps]
const MELODY: [number, number, number, number][] = [
  [0, 0, 88, 4], [0, 4, 91, 2], [0, 6, 88, 2], [0, 8, 86, 2], [0, 10, 88, 2], [0, 12, 84, 4],
  [1, 0, 84, 2], [1, 2, 88, 2], [1, 4, 93, 4], [1, 8, 91, 4], [1, 12, 88, 4],
  [2, 0, 89, 4], [2, 4, 93, 2], [2, 6, 91, 2], [2, 8, 89, 2], [2, 10, 88, 2], [2, 12, 84, 4],
  [3, 0, 86, 4], [3, 4, 91, 4], [3, 8, 95, 4], [3, 12, 93, 2], [3, 14, 91, 2],
  [4, 0, 88, 4], [4, 4, 91, 2], [4, 6, 96, 2], [4, 8, 95, 4], [4, 12, 88, 4],
  [5, 0, 88, 4], [5, 4, 93, 4], [5, 8, 96, 2], [5, 10, 95, 2], [5, 12, 93, 4],
  [6, 0, 93, 4], [6, 4, 96, 4], [6, 8, 93, 2], [6, 10, 91, 2], [6, 12, 89, 4],
  [7, 0, 95, 4], [7, 4, 93, 4], [7, 8, 91, 6],
];

function bell(m: number, when: number, len: number, vol: number) {
  if (!bus) return;
  const { ctx, music } = bus;
  const f = mtof(m), t = when;
  for (const [mul, v, type] of [[1, 1, "triangle"], [2, 0.35, "sine"], [3, 0.12, "sine"]] as [number, number, OscillatorType][]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f * mul;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(music); o.start(t); o.stop(t + len + 0.05);
  }
}
function pluckBass(m: number, when: number) {
  if (!bus) return;
  const { ctx, music } = bus, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "triangle"; o.frequency.value = mtof(m + 12);
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.2, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
  o.connect(g).connect(music); o.start(when); o.stop(when + 0.35);
}
function hat(when: number, vol: number) {
  if (!bus) return;
  const { ctx, music, noise } = bus, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = "highpass"; f.frequency.value = 7500;
  g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  s.connect(f).connect(g).connect(music); s.start(when); s.stop(when + 0.07);
}

function schedule() {
  if (!bus) return;
  const { ctx } = bus;
  while (nextTime < ctx.currentTime + 0.2) {
    const pos = step % 128, bar = pos >> 4, s = pos & 15, chord = bar & 3;
    if (nextTime >= ctx.currentTime) {
      if (s % 2 === 0) bell(CHORDS[chord][ARP[s >> 1]] + 12, nextTime, 0.5, 0.075);          // sparkling arpeggio
      for (const [b, st, m, len] of MELODY) if (b === bar && st === s) bell(m, nextTime, Math.max(0.35, len * STEP * 1.5), 0.17);   // lead
      if (s === 0 || s === 6 || s === 8 || s === 12) pluckBass(BASS[chord], nextTime);
      if (s % 4 === 2) hat(nextTime, 0.05);
      if (s === 4 || s === 12) hat(nextTime, 0.025);
    }
    nextTime += STEP; step++;
  }
}

export function startMusic() {
  const b = bus; if (!b || timer || !soundOn()) return;
  nextTime = b.ctx.currentTime + 0.15; step = 0;
  b.music.gain.cancelScheduledValues(b.ctx.currentTime);
  b.music.gain.setValueAtTime(b.music.gain.value, b.ctx.currentTime);
  b.music.gain.linearRampToValueAtTime(1, b.ctx.currentTime + 2.5);
  timer = window.setInterval(schedule, 30);
}
export function stopMusic() {
  if (timer) { clearInterval(timer); timer = 0; }
  if (bus) { const t = bus.ctx.currentTime; bus.music.gain.cancelScheduledValues(t); bus.music.gain.setValueAtTime(bus.music.gain.value, t); bus.music.gain.linearRampToValueAtTime(0, t + 0.25); }
}

/** Call from a user gesture: creates/resumes the audio engine and starts the music if sound is on. */
export function unlockAudio(): boolean {
  const b = build(); if (!b) return false;
  if (b.ctx.state !== "running") void b.ctx.resume().then(() => { if (soundOn()) startMusic(); });
  else if (soundOn()) startMusic();
  return true;
}
export const audioRunning = () => !!bus && bus.ctx.state === "running";

export function setSound(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent("ghosthub:sound", { detail: on }));
  if (on) { unlockAudio(); setTimeout(() => sfx.success(), 120); } else stopMusic();
}

/** Pause while the tab is hidden, resume when it is back. */
export function bindVisibility() {
  const f = () => {
    if (!bus) return;
    if (document.hidden) void bus.ctx.suspend(); else void bus.ctx.resume();
  };
  document.addEventListener("visibilitychange", f);
  return () => document.removeEventListener("visibilitychange", f);
}
