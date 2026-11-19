import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseHost = "";
try {
  supabaseHost = supabaseUrl ? new URL(supabaseUrl).origin : "";
} catch {
  supabaseHost = "";
}

// Signed storage URLs live on the Supabase origin; everything else is self-hosted.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src 'self' data: blob: ${supabaseHost}`.trim(),
  `media-src 'self' blob: ${supabaseHost}`.trim(),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next.js needs inline scripts for hydration; 'unsafe-eval' only in dev.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' ${supabaseHost} ${supabaseHost.replace("https://", "wss://")}`.trim(),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: { "/api/studio/import": ["./node_modules/@sparticuz/chromium/bin/**"] },
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/explore", destination: "/", permanent: false },
      { source: "/arcade", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // The private dashboard must never be cached or indexed.
        source: "/studio/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
