"use client";
import { useEffect, useState } from "react";
import { lightsOn, setLights, setSound, soundOn } from "@/lib/cave";

/** Two switches: Sound (ambience, screeches and vibration, off by default) and Lights (floods the page, no flashlight dimming). */
export default function CaveControls() {
  const [sound, setS] = useState(false);
  const [lights, setL] = useState(false);
  useEffect(() => { setS(soundOn()); setL(lightsOn()); }, []);
  const base = "inline-flex h-9 w-9 items-center justify-center rounded-[3px] border text-[15px] transition-colors";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-pressed={sound}
        aria-label={sound ? "Turn cave sound and vibration off" : "Turn cave sound and vibration on"}
        title="Sound & vibration"
        className={`${base} ${sound ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-faint hover:text-text"}`}
        onClick={() => { const n = !sound; setS(n); setSound(n); }}
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          {sound ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={lights}
        aria-label={lights ? "Back to the dark (flashlight mode)" : "Turn the lights on"}
        title="Lights"
        className={`${base} ${lights ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-faint hover:text-text"}`}
        onClick={() => { const n = !lights; setL(n); setLights(n); }}
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.2h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
        </svg>
      </button>
    </div>
  );
}
