"use client";
import { useEffect, useState } from "react";
import { ACHIEVEMENTS, getUnlocked, unlock } from "@/lib/cave";

export default function Achievements() {
  const [have, setHave] = useState<string[]>([]);
  useEffect(() => {
    unlock("cellar");
    setHave(getUnlocked());
    const on = () => setHave(getUnlocked());
    window.addEventListener("ghost-ach", on);
    return () => window.removeEventListener("ghost-ach", on);
  }, []);
  return (
    <ul className="not-prose grid gap-3 sm:grid-cols-2">
      {Object.entries(ACHIEVEMENTS).map(([id, a]) => {
        const got = have.includes(id);
        return (
          <li key={id} className={`card p-4 ${got ? "card-major" : "opacity-70"}`}>
            <p className="font-display text-lg">{got ? a.title : "???"}</p>
            <p className="mt-1 text-xs text-muted">{got ? "Unlocked" : a.hint}</p>
          </li>
        );
      })}
    </ul>
  );
}
