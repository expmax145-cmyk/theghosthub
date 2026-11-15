export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <svg className="lantern h-20 w-14" viewBox="0 0 56 80" aria-hidden="true">
        <path d="M28 0v14" stroke="#8a8272" strokeWidth="2" />
        <rect x="14" y="14" width="28" height="44" rx="4" fill="#1a0a0d" stroke="#8a8272" strokeWidth="2" />
        <ellipse cx="28" cy="36" rx="8" ry="13" fill="#e0212c" opacity="0.9" />
        <ellipse cx="28" cy="38" rx="4" ry="7" fill="#ffb199" />
        <path d="M12 58h32l-4 10H16z" fill="#8a8272" />
      </svg>
      <p className="text-xs uppercase tracking-[0.35em] text-faint">Lighting the way…</p>
    </div>
  );
}
