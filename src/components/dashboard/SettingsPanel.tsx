"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { DashboardData } from "@/lib/dashboard-types";
import { formatDate } from "@/lib/utils";

export default function SettingsPanel({ data, onClose }: { data: DashboardData; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(data.profile.display_name);
  const [headline, setHeadline] = useState(data.profile.headline);
  const [bio, setBio] = useState(data.profile.bio);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  const say = (ok: boolean, text: string) => setMsg({ ok, text });

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await getBrowserClient().from("profiles")
      .update({ display_name: name.trim().slice(0, 60) || "Creator", headline: headline.trim().slice(0, 160), bio: bio.trim().slice(0, 600) })
      .eq("id", data.profile.id);
    setBusy(false);
    if (error) return say(false, error.message);
    say(true, "Saved. The showcase hero now uses this text."); router.refresh();
  }

  async function startEnroll() {
    setBusy(true);
    const { data: d, error } = await getBrowserClient().auth.mfa.enroll({ factorType: "totp", friendlyName: `hub-${Date.now()}` });
    setBusy(false);
    if (error || !d) return say(false, error?.message ?? "Could not start setup.");
    setEnroll({ id: d.id, qr: d.totp.qr_code, secret: d.totp.secret });
  }
  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault(); if (!enroll) return; setBusy(true);
    const sb = getBrowserClient();
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId: enroll.id });
    const { error: e2 } = e1 || !ch ? { error: e1 } : await sb.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code: code.trim() });
    setBusy(false);
    if (e1 || e2) return say(false, "That code was not accepted. Try the next one.");
    setEnroll(null); setCode(""); say(true, "Two-step verification is on. You will be asked for a code at each sign-in."); router.refresh();
  }
  async function signOut() { await getBrowserClient().auth.signOut(); window.location.href = "/studio"; }

  return (
    <dialog ref={ref} onClose={onClose} className="m-0 ml-auto h-dvh w-full max-w-lg overflow-y-auto border-l border-line bg-ink p-0 text-text" aria-label="Settings">
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-ink/95 px-4 py-3 backdrop-blur sm:px-6">
        <h2 className="font-display text-xl">Settings</h2><button className="btn btn-ghost btn-sm" onClick={() => ref.current?.close()}>Close</button>
      </div>
      <div className="space-y-8 px-4 py-6 sm:px-6">
        <form onSubmit={saveProfile} className="space-y-4">
          <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Public identity</h3>
          <div><label className="label" htmlFor="sn">Display name</label><input id="sn" className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label" htmlFor="sh">Headline <span className="text-faint">(hero title)</span></label><input id="sh" className="field" value={headline} maxLength={160} onChange={(e) => setHeadline(e.target.value)} placeholder="Building apps, games and experiments from India." /></div>
          <div><label className="label" htmlFor="sb">Intro <span className="text-faint">(hero text)</span></label><textarea id="sb" className="field" rows={4} value={bio} maxLength={600} onChange={(e) => setBio(e.target.value)} /></div>
          <button className="btn btn-primary" disabled={busy}>Save identity</button>
        </form>

        <div className="space-y-3 border-t border-line pt-6">
          <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Security</h3>
          <p className="text-sm text-muted">Signed in as <span className="text-text">{data.email}</span></p>
          {data.mfaEnrolled ? <p className="text-sm text-sage">Two-step verification is enabled.</p> : enroll ? (
            <form onSubmit={confirmEnroll} className="space-y-3">
              <p className="text-sm text-muted">Scan this with an authenticator app, then enter the 6-digit code.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="Authenticator QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
              <p className="break-all text-xs text-faint">Manual key: <span className="font-mono text-muted">{enroll.secret}</span></p>
              <input className="field w-40 tracking-[0.3em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="Authenticator code" />
              <button className="btn btn-primary ml-2" disabled={busy || code.length !== 6}>Confirm</button>
            </form>
          ) : <button className="btn btn-ghost" onClick={startEnroll} disabled={busy}>Turn on two-step verification</button>}
          <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </div>

        <div className="space-y-3 border-t border-line pt-6">
          <h3 className="text-xs uppercase tracking-[0.14em] text-faint">Recent activity</h3>
          {data.activity.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : (
            <ul className="space-y-1.5 text-xs text-muted">
              {data.activity.map((a) => <li key={a.id}><span className="text-faint">{formatDate(a.created_at)}</span> · {a.operation} {a.resource_type}{a.detail ? ` “${a.detail}”` : ""}</li>)}
            </ul>
          )}
        </div>
        {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm text-sage" : "text-sm text-danger"}>{msg.text}</p>}
      </div>
    </dialog>
  );
}
