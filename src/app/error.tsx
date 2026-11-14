"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-5 px-6">
      <p className="text-xs uppercase tracking-[0.28em] text-accent">Something broke</p>
      <h1 className="font-display text-4xl">That did not load.</h1>
      <p className="text-muted">A temporary problem occurred. Try again, and if it keeps happening please come back later.</p>
      <div className="flex gap-3">
        <button className="btn btn-primary" onClick={reset}>Try again</button>
        <a className="btn btn-ghost" href="/">Home</a>
      </div>
    </main>
  );
}
