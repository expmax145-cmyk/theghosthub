/**
 * Ghost Hub audio: every sound is synthesised with the Web Audio API (no files, no network).
 * Sound is ON by default and can be switched off with the speaker button; browsers only allow audio
 * after a first tap/click/key, so everything starts on that first interaction.
 */
const KEY = "ghosthub-music";   // only the background music can be switched off; effects always play

type Bus = { ctx: AudioContext; sfx: GainNode; music: GainNode; noise: AudioBuffer };
let bus: Bus | null = null;
let timer = 0;
let nextTime = 0;
let step = 0;

export function musicOn(): boolean {
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
    const music = ctx.createGain(); music.gain.value = 0;
    // warm, smooth music chain: low-pass -> dry + soft echo + room reverb
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200; lp.Q.value = 0.4;
    music.connect(lp); lp.connect(master);
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.28; const dwet = ctx.createGain(); dwet.gain.value = 0.16;
    lp.connect(delay); delay.connect(fb).connect(delay); delay.connect(dwet).connect(master);
    const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 2.4), ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
    const verb = ctx.createConvolver(); verb.buffer = ir; const vwet = ctx.createGain(); vwet.gain.value = 0.3;
    lp.connect(verb); verb.connect(vwet).connect(master);
    const len = ctx.sampleRate; const noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    bus = { ctx, sfx, music, noise };
    return bus;
  } catch { return null; }
}

const live = () => (bus && bus.ctx.state === "running" ? bus : null);
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
  /** A ~6 second party tune: four-on-the-floor kick, claps, a rising arpeggio run, stabs and a cymbal finish. */
  party: () => {
    const beat = 60 / 132;
    for (let i = 0; i < 12; i++) {
      const t = i * beat;
      tone(135, 0.16, "sine", 0.34, 45, t);
      noiseBurst(0.06, 0.11, 7500, 7500, "highpass", t + beat / 2);
      if (i % 2 === 1) noiseBurst(0.13, 0.22, 1800, 1500, "bandpass", t);
      tone(mtof([48, 48, 43, 43, 45, 45, 41, 43, 48, 48, 43, 43][i]), beat * 0.9, "sine", 0.26, undefined, t);
    }
    const run = [72, 76, 79, 84, 88, 91, 96, 91, 88, 84, 79, 76];
    for (let r = 0; r < 2; r++) run.forEach((m, i) => tone(mtof(m + (r ? 5 : 0)), 0.16, "triangle", 0.15, undefined, r * 6 * beat + i * (beat / 2)));
    [0, 4, 8].forEach((b, k) => [72, 76, 79, 84].forEach((m) => tone(mtof(m + k * 2), 0.5, "square", 0.045, undefined, b * beat + 0.02)));
    [84, 88, 91, 96].forEach((m) => tone(mtof(m), 1.1, "triangle", 0.16, undefined, 10 * beat));
    noiseBurst(1.3, 0.18, 9000, 3000, "highpass", 10 * beat);
  },
  success: () => [1046, 1318, 1568].forEach((f, i) => tone(f, 0.16, "triangle", 0.14, undefined, i * 0.07)),
  error: () => { tone(300, 0.14, "square", 0.1, 200); tone(220, 0.18, "square", 0.1, 150, 0.12); },
};

/** Generic short blip (kept for the arcade game). */
export function blip(freq = 520, dur = 0.05, vol = 0.04) {
  tone(freq, Math.max(dur, 0.06), "triangle", Math.min(0.3, vol * 3.5), freq * 1.5);
}

/* ---------- Background music: a warm, gentle 16-bar loop (music box + soft pad + mellow bass) ---------- */
const BPM = 104, STEP = 60 / BPM / 4;                          // one 16th note
type Chord = { bass: number; pad: number[]; arp: number[] };
const CMAJ: Chord = { bass: 48, pad: [60, 64, 67, 71], arp: [72, 76, 79, 83] };
const AM7: Chord = { bass: 45, pad: [60, 64, 67, 69], arp: [69, 72, 76, 79] };
const FMAJ: Chord = { bass: 41, pad: [60, 64, 65, 69], arp: [72, 76, 77, 81] };
const GMAJ: Chord = { bass: 43, pad: [62, 67, 71, 74], arp: [74, 79, 83, 86] };
const EM7: Chord = { bass: 40, pad: [59, 62, 64, 67], arp: [71, 74, 76, 79] };
const G7: Chord = { bass: 43, pad: [59, 62, 65, 67], arp: [71, 74, 77, 79] };
const DM7: Chord = { bass: 38, pad: [60, 62, 65, 69], arp: [74, 77, 81, 84] };
const PROG: Chord[] = [CMAJ, AM7, FMAJ, GMAJ, CMAJ, EM7, FMAJ, G7, AM7, EM7, FMAJ, CMAJ, DM7, G7, EM7, AM7];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];                           // eighth notes per bar
// melody per bar: [step, midi, length in steps]
const MELODY_BARS: [number, number, number][][] = [
  [[0, 88, 4], [4, 86, 2], [6, 84, 2], [8, 86, 4], [12, 91, 4]],
  [[0, 93, 4], [4, 91, 2], [6, 88, 2], [8, 86, 6]],
  [[0, 89, 4], [4, 88, 2], [6, 86, 2], [8, 84, 4], [12, 88, 4]],
  [[0, 86, 6], [6, 88, 2], [8, 91, 8]],
  [[0, 88, 4], [4, 91, 2], [6, 93, 2], [8, 96, 4], [12, 93, 4]],
  [[0, 91, 4], [4, 88, 4], [8, 86, 2], [10, 88, 2], [12, 91, 4]],
  [[0, 89, 4], [4, 93, 4], [8, 91, 2], [10, 89, 2], [12, 88, 4]],
  [[0, 86, 4], [4, 91, 4], [8, 95, 6], [14, 93, 2]],
  [[0, 93, 4], [4, 96, 2], [6, 93, 2], [8, 91, 4], [12, 88, 4]],
  [[0, 91, 4], [4, 88, 2], [6, 86, 2], [8, 88, 8]],
  [[0, 89, 4], [4, 93, 4], [8, 96, 4], [12, 93, 4]],
  [[0, 95, 6], [6, 91, 2], [8, 88, 4], [12, 91, 4]],
  [[0, 89, 4], [4, 93, 2], [6, 96, 2], [8, 98, 4], [12, 96, 4]],
  [[0, 95, 4], [4, 91, 2], [6, 89, 2], [8, 86, 4], [12, 91, 4]],
  [[0, 88, 4], [4, 91, 4], [8, 95, 4], [12, 91, 4]],
  [[0, 93, 6], [6, 88, 2], [8, 84, 8]],
];
const MELODY = new Map<number, [number, number]>();
MELODY_BARS.forEach((notes, bar) => notes.forEach(([st, m, len]) => MELODY.set(bar * 16 + st, [m, len])));

function voice(type: OscillatorType, freq: number, when: number, attack: number, len: number, vol: number, detune = 0) {
  if (!bus) return;
  const { ctx, music } = bus, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + len);
  o.connect(g).connect(music); o.start(when); o.stop(when + len + 0.05);
}
/** Soft music-box lead: two slightly detuned sines plus a quiet octave. */
function lead(m: number, when: number, len: number) {
  const f = mtof(m), L = Math.max(0.5, len * STEP * 1.4);
  voice("sine", f, when, 0.02, L, 0.13, -4); voice("sine", f, when, 0.02, L, 0.11, 4); voice("sine", f * 2, when, 0.02, L * 0.7, 0.03);
}
function arp(m: number, when: number) { const f = mtof(m); voice("sine", f, when, 0.01, 0.55, 0.05); voice("sine", f * 2, when, 0.01, 0.25, 0.012); }
function pad(m: number, when: number, dur: number) { const f = mtof(m); voice("sine", f, when, 0.5, dur, 0.034, -6); voice("triangle", f, when, 0.6, dur, 0.012, 6); }
function bass(m: number, when: number, len: number) { voice("sine", mtof(m), when, 0.012, len, 0.24); voice("triangle", mtof(m + 12), when, 0.012, len * 0.6, 0.03); }
function kick(when: number) {
  if (!bus) return; const { ctx, music } = bus, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(125, when); o.frequency.exponentialRampToValueAtTime(48, when + 0.12);
  g.gain.setValueAtTime(0.2, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  o.connect(g).connect(music); o.start(when); o.stop(when + 0.25);
}
function shaker(when: number, vol: number) {
  if (!bus) return; const { ctx, music, noise } = bus, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = "bandpass"; f.frequency.value = 6200; f.Q.value = 0.8;
  g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
  s.connect(f).connect(g).connect(music); s.start(when); s.stop(when + 0.09);
}

function schedule() {
  if (!bus) return;
  const { ctx } = bus;
  while (nextTime < ctx.currentTime + 0.2) {
    const pos = step % 256, bar = pos >> 4, s = pos & 15, ch = PROG[bar];
    if (nextTime >= ctx.currentTime - 0.02) {
      if (s === 0) ch.pad.forEach((m) => pad(m, nextTime, 16 * STEP * 1.05));
      if (s % 2 === 0) arp(ch.arp[ARP[s >> 1]], nextTime);
      const mel = MELODY.get(bar * 16 + s); if (mel) lead(mel[0], nextTime, mel[1]);
      if (s === 0) bass(ch.bass, nextTime, 0.7); else if (s === 8) bass(ch.bass + (bar & 1 ? 7 : 0), nextTime, 0.6); else if (s === 14 && bar % 4 === 3) bass(ch.bass + 7, nextTime, 0.3);
      if (s === 0 || s === 8) kick(nextTime);
      if (s % 4 === 2) shaker(nextTime, 0.045);
    }
    nextTime += STEP; step++;
  }
}

export function startMusic() {
  const b = bus; if (!b || timer || !musicOn()) return;
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
  if (b.ctx.state !== "running") void b.ctx.resume().then(() => { if (musicOn()) startMusic(); });
  else if (musicOn()) startMusic();
  return true;
}
export const audioRunning = () => !!bus && bus.ctx.state === "running";

export function setMusic(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent("ghosthub:music", { detail: on }));
  if (on) unlockAudio(); else stopMusic();
  setTimeout(() => sfx.pop(), 60);
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
