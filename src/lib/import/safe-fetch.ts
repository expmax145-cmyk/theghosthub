import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/** Test-only escape hatch so the importer can be pointed at a local fixture site. Never set in production. */
const ALLOW_PRIVATE = process.env.IMPORT_ALLOW_PRIVATE === "1";

export class ImportError extends Error {}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

/** Throws unless the URL is plain http(s) to a public host. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new ImportError("That is not a valid URL."); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new ImportError("Only http(s) links can be imported.");
  if (u.username || u.password) throw new ImportError("Links with a username or password are not allowed.");
  if (ALLOW_PRIVATE) return u;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new ImportError("That address is not public.");
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new ImportError("Could not find that website (DNS lookup failed)."); });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new ImportError("That address is not public.");
  return u;
}

export interface Fetched { url: string; status: number; type: string; bytes: Uint8Array; truncated: boolean; headers: Headers }

/** SSRF-guarded GET: validates every redirect hop, caps time and size. */
export async function safeFetch(raw: string, opts: { maxBytes?: number; timeoutMs?: number; accept?: string } = {}): Promise<Fetched> {
  const maxBytes = opts.maxBytes ?? 3_000_000;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 12_000);
  try {
    let url = raw;
    for (let hop = 0; hop < 6; hop++) {
      const u = await assertPublicUrl(url);
      const res = await fetch(u, {
        redirect: "manual", signal: ctl.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; GhostHubImporter/1.0)", accept: opts.accept ?? "*/*", "accept-language": "en" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location")!, u).toString();
        await res.body?.cancel().catch(() => {});
        continue;
      }
      const chunks: Uint8Array[] = [];
      let total = 0, truncated = false;
      const reader = res.body?.getReader();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) { truncated = true; await reader.cancel().catch(() => {}); break; }
        chunks.push(value);
      }
      const bytes = new Uint8Array(Math.min(total, maxBytes));
      let o = 0;
      for (const c of chunks) { bytes.set(c.subarray(0, bytes.length - o), o); o += c.length; }
      return { url, status: res.status, type: (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase(), bytes, truncated, headers: res.headers };
    }
    throw new ImportError("Too many redirects.");
  } catch (e) {
    if (e instanceof ImportError) throw e;
    if ((e as Error).name === "AbortError") throw new ImportError("The website took too long to respond.");
    throw new ImportError("Could not reach that link.");
  } finally { clearTimeout(timer); }
}
