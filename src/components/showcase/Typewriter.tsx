"use client";
import { useEffect, useState } from "react";

/** Types and deletes a rotating list of phrases. Static (first phrase) under reduced motion. */
export default function Typewriter({ words }: { words: string[] }) {
  const [text, setText] = useState(words[0]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let w = 0, i = words[0].length, del = true, t = 0;
    const tick = () => {
      const word = words[w];
      if (del) { i--; setText(word.slice(0, Math.max(i, 0))); if (i <= 0) { del = false; w = (w + 1) % words.length; t = window.setTimeout(tick, 350); return; } t = window.setTimeout(tick, 32); }
      else { const nw = words[w]; i++; setText(nw.slice(0, i)); if (i >= nw.length) { del = true; t = window.setTimeout(tick, 1700); return; } t = window.setTimeout(tick, 65); }
    };
    t = window.setTimeout(tick, 1800);
    return () => clearTimeout(t);
  }, [words]);
  return <span className="font-semibold text-text"><span aria-hidden="true">{text}</span><span className="sr-only">{words.join(", ")}</span><span className="tw-caret" aria-hidden="true" /></span>;
}
