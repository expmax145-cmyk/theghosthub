// Tiny stand-in for Supabase REST + signed-URL endpoints, used ONLY to exercise the real
// data-loading code and UI locally (no secrets, no network). Not a security test.
import http from "node:http";
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = "2026-11-10T10:00:00Z";
const base = { description: "", features: [], tags: [], status: "released", visibility: "published", thumbnail_file_id: null, live_demo_url: null, video_url: null, extra_links: [], is_featured: false, created_on: "2026-05-01", published_at: now, created_at: now, updated_at: now, public_repository_url: null };
const projects = [
  { ...base, id: U(1), name: "Apex Horizon 3D", slug: "apex-horizon-3d", category: "Games", technologies: ["Unity", "C#", "Android"], short_description: "A fast, low-poly Android racing game with a garage and tuning system.", description: "Apex Horizon is a mobile racing game built for mid-range phones.\n\nIt targets a stable 60 FPS and ships with touch and tilt controls.", features: ["60 FPS target on mid-range phones", "Garage and upgrades", "Tilt + touch steering"], is_featured: true, thumbnail_file_id: U(101), live_demo_url: "https://example.com/play", public_repository_url: "https://github.com/example/apex", extra_links: [{ label: "Devlog", url: "https://example.com/devlog" }] },
  { ...base, id: U(2), name: "Streetside", slug: "streetside", category: "Websites", live_demo_url: "https://example.com/streetside", technologies: ["Next.js", "TypeScript", "Tailwind"], short_description: "A neighbourhood guide with live maps.", is_featured: true, thumbnail_file_id: U(102), updated_at: "2026-11-09T10:00:00Z" },
  { ...base, id: U(3), name: "Pocket Tutor", slug: "pocket-tutor", category: "AI Projects", technologies: ["Python", "LLM"], short_description: "An offline study assistant experiment.", status: "prototype", is_featured: true, updated_at: "2026-11-01T10:00:00Z" },
  { ...base, id: U(4), name: "Sprite Forge", slug: "sprite-forge", category: "Experiments", technologies: ["Canvas", "JavaScript"], short_description: "Procedural pixel-art generator running entirely in the browser.", thumbnail_file_id: U(103), updated_at: "2026-10-20T10:00:00Z" },
  { ...base, id: U(5), name: "Habit Orbit", slug: "habit-orbit", category: "Android Applications", technologies: ["Kotlin", "Jetpack Compose"], short_description: "A habit tracker with a calm orbit-style streak view.", updated_at: "2026-10-10T10:00:00Z" },
];
const mk = (n, pid, role, name, extra = {}) => ({ id: U(n), project_id: pid, role, original_filename: name, storage_key: `k/${name}`, mime_type: role === "attachment" ? "application/zip" : "image/png", file_size: 1048576 * 3, checksum: "a".repeat(64), visibility: "public", sort_order: n, created_at: now, ...extra });
const files = [
  mk(101, U(1), "thumbnail", "apex-thumb.png"), mk(102, U(2), "thumbnail", "street-thumb.png"), mk(103, U(4), "thumbnail", "sprite-thumb.png"),
  mk(104, U(1), "screenshot", "apex-1.png"), mk(105, U(1), "screenshot", "apex-2.png"),
  mk(107, U(2), "screenshot", "street-1.png"), mk(108, U(2), "screenshot", "street-2.png"),
  mk(106, U(1), "attachment", "apex-horizon.apk", { mime_type: "application/vnd.android.package-archive", file_size: 41943040 }),
];
const releases = [{ id: U(201), project_id: U(1), version: "1.2.0", release_notes: "New garage, FPS fixes.", release_date: "2026-11-01", visibility: "public" }];
const profiles = [{ id: U(900), display_name: "Expmax", avatar_url: null, headline: "I build Android games, websites and AI experiments.", bio: "A collection of the things I make, from racing games to small web tools." }];
const hues = [30, 200, 150, 280, 10, 90];
const svg = (key) => { const h = hues[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length]; return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 45% 28%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360} 35% 12%)"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="560" cy="180" r="90" fill="hsl(${h} 70% 62% / .35)"/></svg>`; };
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "content-type": type, "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" }); res.end(typeof body === "string" ? body : JSON.stringify(body)); };
http.createServer((req, res) => { if (process.env.MOCK_LOG) console.log(req.method, req.url, req.headers.accept);
  const u = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204, "");
  if (u.pathname === "/auth/v1/user") return send(res, 200, { id: U(900), aud: "authenticated", role: "authenticated", email: "owner@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
  if (u.pathname === "/rest/v1/projects") return send(res, 200, process.env.MOCK_EMPTY ? [] : projects);
  if (u.pathname === "/rest/v1/files") return send(res, 200, files);
  if (u.pathname === "/rest/v1/releases") return send(res, 200, releases);
  if (u.pathname === "/rest/v1/rpc/is_owner") return send(res, 200, true);
  if (u.pathname === "/rest/v1/profiles") return send(res, 200, (String(req.headers.accept).includes("pgrst.object") || u.searchParams.has("id")) ? { ...profiles[0], is_owner: true } : profiles);
  if (u.pathname.startsWith("/storage/v1/object/sign/hub-files") && req.method === "POST") {
    let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { const { paths } = JSON.parse(b || "{}"); send(res, 200, (paths ?? []).map((p) => ({ path: p, signedURL: `/object/sign/hub-files/${p}?token=t`, error: null }))); }); return;
  }
  if (u.pathname.startsWith("/storage/v1/object/sign/hub-files/")) return send(res, 200, svg(u.pathname), "image/svg+xml");
  send(res, 404, { message: "not found" });
}).listen(54399, () => console.log("mock supabase on :54399"));
