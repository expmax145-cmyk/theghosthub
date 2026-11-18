"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GhostMark } from "@/components/site/Logo";
import { sfx } from "@/lib/sound";

const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];
const ANSWERS = [
  "Yes. Definitely. Probably. Don't quote me.", "Ask again after snacks.", "My ghost senses say: nope.", "The spirits are on lunch break. Try later.",
  "Absolutely! (I'm contractually obligated to say that.)", "73% yes, 27% I'm a ghost, how would I know.", "Outlook hazy. Like me. Because ghost.",
  "Only if you do a tiny dance first.", "Boo-tiful idea. Yes.", "Nope. But I admire your confidence.", "Yes! Unless it's Monday.", "I asked my crystal ball. It asked for a refund.",
  "Signs point to yes. Also to snacks.", "Without a doubt. With several doubts, actually.", "Hmm. Ask a ghost with fewer opinions.",
];
const JOKES = [
  "Why don't ghosts lie? Because you can see right through them.", "What's a ghost's favourite pasta? Spook-ghetti.", "Why did the ghost go to the bar? For the boos.",
  "What do ghosts eat for lunch? Boo-ritos.", "How do ghosts stay in shape? Exorcise.", "What's a ghost's favourite dessert? I scream. (Ice cream.)",
];
const NAME = ["I'm Wisp! Ghost by day, ghost by night, ghost on weekends.", "Wisp. Like a whisper, but with more floating."];
const HELLO = ["Hello! I'd wave, but, you know. Sleeves.", "Hi hi hi! Ask me something!"];

function reply(q: string): string {
  const s = q.toLowerCase();
  if (/joke|funny|laugh/.test(s)) return pick(JOKES);
  if (/who are you|your name|who r u|what are you/.test(s)) return pick(NAME);
  if (/^(hi|hello|hey|yo)\b/.test(s)) return pick(HELLO);
  if (/love|marry|date/.test(s)) return "I'm flattered! But I'm a ghost. It would never work. (I'd phase through the relationship.)";
  if (/pizza|food|hungry/.test(s)) return "Pizza. Always pizza. I can't eat it, but I respect it.";
  if (/boo|scary|scare/.test(s)) return "BOO! …Did it work? I can never tell.";
  return pick(ANSWERS);
}

/** A magic-8-ball style fortune teller: the ghost wobbles, thinks, then answers (usually with a joke). */
export default function AskWisp({ label = "Ask Wisp ✦", primary = false }: { label?: string; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [ans, setAns] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQ(""); setAns(""); setBusy(false);
    setTimeout(() => input.current?.focus(), 50);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.documentElement.style.overflow = ""; clearTimeout(timer.current); };
  }, [open]);

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setAns(""); sfx.giggle();
    timer.current = window.setTimeout(() => { setAns(reply(q.trim())); setBusy(false); sfx.pop(); }, 1300);
  };

  return (
    <>
      <button type="button" className={`btn btn-sm ${primary ? "btn-primary" : "btn-ghost"}`} onClick={() => { sfx.open(); setOpen(true); }}>{label}</button>
      {open && createPortal(
        <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Ask Wisp" className="palette-in w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-5 text-center shadow-2xl">
            <div className="flex justify-end"><button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-raised hover:text-text">✕</button></div>
            <div className={`mx-auto -mt-2 w-24 ${busy ? "wisp-wobble" : "wisp-float"}`}><GhostMark className="h-full w-full drop-shadow-[0_12px_28px_rgb(var(--glow-a)/0.55)]" /></div>
            <p className="mt-3 font-display text-xl font-bold">Ask Wisp anything</p>
            <p className="mt-1 text-sm text-muted">Yes/no questions work best. Jokes work even better.</p>
            <form onSubmit={ask} className="mt-4 flex gap-2">
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Will today be a good day?" aria-label="Your question" className="field flex-1" />
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "…" : "Ask"}</button>
            </form>
            <div className="mt-4 min-h-[4.5rem]" aria-live="polite">
              {busy && <p className="text-sm text-muted">Consulting the spirits… <span className="inline-block animate-bounce">👻</span></p>}
              {ans && <p key={ans} className="bubble rounded-2xl border border-line bg-raised px-4 py-3 text-[15px] font-medium leading-snug">{ans}</p>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
