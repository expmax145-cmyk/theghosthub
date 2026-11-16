"use client";
import Logo from "@/components/site/Logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

type State = "unconfigured" | "signed-out" | "not-owner" | "mfa" | "reset";

export default function Login({ state, email, notice }: { state: State; email?: string; notice?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "forgot" | "mfa" | "reset">(state === "mfa" ? "mfa" : state === "reset" ? "reset" : "signin");
  const [em, setEm] = useState(email ?? "");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(notice ? { kind: "error", text: notice } : null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." }); }
    setBusy(false);
  }

  const signIn = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const sb = getBrowserClient();
    const { error } = await sb.auth.signInWithPassword({ email: em.trim(), password: pw });
    // Same wording for every failure so the form cannot be used to discover valid emails.
    if (error) throw new Error(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "Email or password is incorrect.");
    const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") { setMode("mfa"); return; }
    router.refresh();
  }); };

  const verifyMfa = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const sb = getBrowserClient();
    const { data: f } = await sb.auth.mfa.listFactors();
    const factor = f?.totp.find((x: { status: string }) => x.status === "verified");
    if (!factor) throw new Error("No authenticator is set up for this account.");
    const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId: factor.id });
    if (e1 || !ch) throw new Error("Could not start verification. Try again.");
    const { error: e2 } = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: code.trim() });
    if (e2) throw new Error("That code is not valid. Check the time on your phone and try again.");
    router.refresh();
  }); };

  const forgot = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    await getBrowserClient().auth.resetPasswordForEmail(em.trim(), { redirectTo: `${window.location.origin}/auth/callback` });
    setMsg({ kind: "ok", text: "If that address belongs to the owner account, a reset link is on its way." });
  }); };

  const setNew = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    if (pw.length < 10) throw new Error("Use at least 10 characters.");
    const { error } = await getBrowserClient().auth.updateUser({ password: pw });
    if (error) throw new Error(error.message);
    router.replace("/studio");
    router.refresh();
  }); };

  const signOut = () => run(async () => { await getBrowserClient().auth.signOut(); window.location.href = "/studio"; });

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo size="text-xl" />
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-faint">Creator dashboard</p>

        <div className="card card-major mt-6 p-5 sm:p-6">
          {state === "unconfigured" ? (
            <div role="alert" className="space-y-2 text-sm text-muted">
              <p className="font-medium text-text">Setup needed</p>
              <p>Supabase is not configured. Add the project URL and publishable key to the environment (see <code>.env.example</code>).</p>
            </div>
          ) : state === "not-owner" ? (
            <div className="space-y-4 text-sm text-muted" role="alert">
              <p>This account is not the owner of this hub, so the dashboard stays closed.</p>
              <button className="btn btn-ghost w-full" onClick={signOut} disabled={busy}>Sign out</button>
            </div>
          ) : mode === "mfa" ? (
            <form onSubmit={verifyMfa} className="space-y-4">
              <div><h1 className="font-display text-2xl">Two-step check</h1><p className="mt-1 text-sm text-muted">Enter the 6-digit code from your authenticator app.</p></div>
              <div><label className="label" htmlFor="code">Code</label>
                <input id="code" className="field tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus /></div>
              <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify"}</button>
              <button type="button" className="w-full text-xs text-muted hover:text-text" onClick={signOut}>Use a different account</button>
            </form>
          ) : mode === "reset" ? (
            <form onSubmit={setNew} className="space-y-4">
              <div><h1 className="font-display text-2xl">Choose a new password</h1></div>
              <div><label className="label" htmlFor="npw">New password</label>
                <input id="npw" className="field" type="password" autoComplete="new-password" minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus /></div>
              <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
            </form>
          ) : mode === "forgot" ? (
            <form onSubmit={forgot} className="space-y-4">
              <div><h1 className="font-display text-2xl">Reset password</h1><p className="mt-1 text-sm text-muted">We will email you a recovery link.</p></div>
              <div><label className="label" htmlFor="fem">Email</label>
                <input id="fem" className="field" type="email" autoComplete="email" value={em} onChange={(e) => setEm(e.target.value)} required /></div>
              <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send link"}</button>
              <button type="button" className="w-full text-xs text-muted hover:text-text" onClick={() => { setMode("signin"); setMsg(null); }}>Back to sign in</button>
            </form>
          ) : (
            <form onSubmit={signIn} className="space-y-4">
              <h1 className="font-display text-2xl">Sign in</h1>
              <div><label className="label" htmlFor="em">Email</label>
                <input id="em" className="field" type="email" autoComplete="email" value={em} onChange={(e) => setEm(e.target.value)} required /></div>
              <div><label className="label" htmlFor="pw">Password</label>
                <input id="pw" className="field" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
              <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
              <button type="button" className="w-full text-xs text-muted hover:text-text" onClick={() => { setMode("forgot"); setMsg(null); }}>Forgot password?</button>
            </form>
          )}
          {msg && <p role={msg.kind === "error" ? "alert" : "status"} className={`mt-4 text-sm ${msg.kind === "error" ? "text-danger" : "text-sage"}`}>{msg.text}</p>}
        </div>
        <p className="mt-6 text-center text-xs text-faint"><Link href="/" className="hover:text-text">← Public showcase</Link></p>
      </div>
    </main>
  );
}
