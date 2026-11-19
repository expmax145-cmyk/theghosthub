/** Pure HTML → draft-metadata logic (no I/O), unit-testable. */

export interface Draft {
  name: string; short_description: string; description: string; category: string;
  technologies: string[]; tags: string[]; features: string[]; live_demo_url: string;
  status: "idea" | "prototype" | "in_progress" | "released" | "maintained"; links: { label: string; url: string }[];
  imageCandidates: string[]; // absolute URLs, best first
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
export function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g: string) => {
    if (g[0] === "#") { const n = g[1].toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
    return ENT[g.toLowerCase()] ?? m;
  });
}
const clean = (s: string) => decode(s).replace(/\s+/g, " ").trim();
const strip = (h: string) => clean(h.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "));

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

function abs(href: string | undefined, base: string): string | null {
  if (!href) return null;
  try { const u = new URL(href.trim(), base); return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null; } catch { return null; }
}

const TECH: [string, RegExp][] = [
  ["Next.js", /\/_next\/|__NEXT_DATA__|next-route-announcer/i], ["React", /data-reactroot|react(-dom)?(\.production)?\.min\.js|__reactContainer|\bReactDOM\b/i],
  ["Vue", /\bdata-v-[0-9a-f]{6,}|vue(\.runtime)?(\.global)?(\.prod)?\.js|__vue__|id="app"[^>]*data-server-rendered/i], ["Nuxt", /\/_nuxt\/|__NUXT__/i],
  ["Angular", /ng-version=|<app-root|ng-app\b/i], ["Svelte", /svelte-[a-z0-9]{5,}|\/_app\/immutable\//i], ["Astro", /astro-island|\/_astro\//i],
  ["WordPress", /wp-content\/|wp-includes\/|name="generator"[^>]*WordPress/i], ["Shopify", /cdn\.shopify\.com|Shopify\.theme/i], ["Wix", /static\.wixstatic\.com|wix\.com website builder/i],
  ["Webflow", /data-wf-(page|site)|webflow\.js/i], ["Squarespace", /static1\.squarespace\.com|squarespace-cdn/i], ["Framer", /framerusercontent\.com|data-framer-/i],
  ["Tailwind CSS", /tailwind(css)?|class="[^"]*\b(?:flex|grid)\b[^"]*\b(?:px|py|mt|mb|gap)-\d/i], ["Bootstrap", /bootstrap(\.min)?\.(css|js)|class="[^"]*\bcol-(?:md|lg|sm)-\d/i],
  ["jQuery", /jquery[-.\d]*(\.min)?\.js/i], ["Three.js", /three(\.module)?(\.min)?\.js|THREE\./i], ["Unity WebGL", /UnityLoader|unityFramework|createUnityInstance|\.unityweb/i],
  ["Godot", /godot\.js|Godot\.engine|\.pck\b/i], ["Phaser", /phaser(\.min)?\.js/i], ["WebAssembly", /\.wasm\b|WebAssembly\./i], ["PWA", /rel="manifest"|serviceWorker\.register/i],
  ["Firebase", /firebase(app|-app)?(\.js|\.min\.js)|firebaseapp\.com/i], ["Supabase", /supabase\.co|supabase-js/i], ["Stripe", /js\.stripe\.com/i],
  ["Vite", /\/@vite\/|type="module"[^>]*src="[^"]*\/assets\/index-[\w-]+\.js/i], ["Google Analytics", /googletagmanager\.com|google-analytics\.com/i],
];

const CATEGORY_RULES: [string, RegExp][] = [
  ["Games", /\b(game|play(able)?|arcade|puzzle|level|score|multiplayer|unity|godot|phaser|webgl|fps|rpg|platformer|racing|quiz)\b/i],
  ["Android Applications", /\b(android|apk|google play|play store|mobile app)\b/i],
  ["Experiments", /\b(3d|three\.js|render|shader|model viewer|simulation|visuali[sz]ation|graphics)\b/i],
  ["AI Projects", /\b(ai|machine learning|chatbot|gpt|llm|neural|dataset|analytics|dashboard)\b/i],
  ["Other Innovations", /\b(tool|utility|converter|generator|calculator|editor|extension|plugin|api|cli|productivity)\b/i],
  ["Websites", /\b(portfolio|landing|blog|shop|store|agency|company|website|homepage|news)\b/i],
];

export function guessCategory(text: string, techs: string[], isApk: boolean, known: string[]): string {
  if (isApk && !/\b(game|play)\b/i.test(text)) return pick("Android Applications", known);
  const hay = `${text} ${techs.join(" ")}`;
  for (const [cat, re] of CATEGORY_RULES) if (re.test(hay)) return pick(cat, known);
  return pick("Websites", known);
}
function pick(cat: string, known: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const hit = known.find((k) => norm(k) === norm(cat) || norm(k).startsWith(norm(cat).slice(0, 5)) || norm(cat).startsWith(norm(k).slice(0, 5)) && norm(k).length > 3);
  return hit ?? cat;
}

function sentences(text: string, max: number): string {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((s) => s.trim()) ?? [text];
  let out = "";
  for (const p of parts) { if ((out + " " + p).trim().length > max) break; out = (out + " " + p).trim(); }
  return out || text.slice(0, max).trim();
}

export function analyzeHtml(html: string, finalUrl: string, knownCategories: string[]): Draft {
  const head = html.slice(0, 400_000);
  const meta: Record<string, string> = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property || a.name || a.itemprop || "").toLowerCase();
    if (key && a.content && !(key in meta)) meta[key] = clean(a.content);
  }
  const title = clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? "");
  const h1 = strip(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "");
  const host = new URL(finalUrl).hostname.replace(/^www\./, "");

  let name = meta["og:site_name"] || meta["application-name"] || "";
  if (!name) name = title.split(/\s[|\-–—·:]\s/)[0] || h1 || host;
  name = name.replace(/\s+/g, " ").trim().slice(0, 120);

  const body = html.replace(/<(script|style|noscript|svg|template|nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ");
  const paras = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter((t) => t.length > 40).slice(0, 8);
  const metaDesc = meta["og:description"] || meta["description"] || meta["twitter:description"] || "";
  const lead = metaDesc || paras[0] || h1 || title;
  const short = sentences(lead, 280);
  const seen: string[] = [];
  for (const t of [metaDesc, ...paras].filter(Boolean)) if (!seen.some((x) => x.slice(0, 40).toLowerCase() === t.slice(0, 40).toLowerCase())) seen.push(t);
  const full = seen.join("\n\n").slice(0, 3000) || short;

  const features = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => strip(m[1])).filter((t) => t.length > 12 && t.length < 110 && !/^(home|about|contact|login|sign|privacy|terms)/i.test(t)).slice(0, 8);
  const kw = (meta["keywords"] ?? "").split(",").map((s) => s.trim()).filter((s) => s && s.length < 40).slice(0, 8);

  const techs = TECH.filter(([, re]) => re.test(html)).map(([n]) => n).filter((n) => n !== "Google Analytics");
  const category = guessCategory(`${name} ${metaDesc} ${title} ${h1} ${kw.join(" ")}`, techs, false, knownCategories);

  const cands: string[] = [];
  const push = (u: string | null) => { if (u && !cands.includes(u)) cands.push(u); };
  push(abs(meta["og:image"] || meta["og:image:url"] || meta["twitter:image"], finalUrl));
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (/apple-touch-icon|icon/.test(a.rel ?? "") && a.href) push(abs(a.href, finalUrl));
  }
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const src = a.src || a["data-src"];
    if (!src || /^data:|sprite|pixel|tracking|\.svg(\?|$)/i.test(src)) continue;
    const w = Number(a.width); if (w && w < 120) continue;
    push(abs(src, finalUrl));
    if (cands.length > 14) break;
  }
  push(new URL("/favicon.ico", finalUrl).toString());

  const links: { label: string; url: string }[] = [];
  for (const m of body.matchAll(/<a\b[^>]*>/gi)) {
    const href = abs(attrs(m[0]).href, finalUrl);
    if (!href) continue;
    if (/github\.com\/[^/]+\/[^/?#]+\/?$/i.test(href) && !links.some((l) => l.label === "GitHub")) links.push({ label: "GitHub", url: href });
    if (/play\.google\.com\/store\/apps\/details/i.test(href) && !links.some((l) => l.label === "Google Play")) links.push({ label: "Google Play", url: href });
    if (/(youtube\.com\/watch|youtu\.be\/)/i.test(href) && !links.some((l) => l.label === "Video")) links.push({ label: "Video", url: href });
  }

  return {
    name, short_description: short, description: full, category, technologies: techs.slice(0, 12), tags: [...new Set([...kw, ...techs.slice(0, 3)])].slice(0, 10),
    features, live_demo_url: finalUrl, status: "released", links, imageCandidates: cands,
  };
}
