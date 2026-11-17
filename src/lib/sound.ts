const KEY = "ghosthub-sound";
let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setSound(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent("ghosthub:sound", { detail: on }));
  if (on) blip(660, 0.09);
}
/** A short, quiet UI blip. Only plays when the visitor switched sound on (off by default). */
export function blip(freq = 520, dur = 0.05, vol = 0.04) {
  if (!soundOn()) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = "sine"; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch { /* audio unavailable */ }
}
