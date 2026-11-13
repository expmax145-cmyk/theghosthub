#!/usr/bin/env node
// Independent backup of everything the hub holds: database rows + every stored file, with checksum verification.
//   node scripts/backup.mjs                 -> create backups/<timestamp>/ (needs .env.local values in the environment)
//   node scripts/backup.mjs --verify <dir>  -> re-hash an existing backup against its manifest (works offline)
// A backup is reported as successful ONLY if every file was downloaded and its SHA-256 matched.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

const sha = (file) => new Promise((res, rej) => {
  const h = createHash("sha256"); createReadStream(file).on("data", (d) => h.update(d)).on("error", rej).on("end", () => res(h.digest("hex")));
});

async function verify(dir) {
  const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
  let bad = 0;
  for (const f of manifest.files) {
    try { const got = await sha(path.join(dir, "files", f.path)); if (got !== f.sha256) { bad++; console.error(`MISMATCH ${f.path}`); } }
    catch { bad++; console.error(`MISSING  ${f.path}`); }
  }
  console.log(bad ? `VERIFY FAILED: ${bad} of ${manifest.files.length} files bad` : `VERIFY OK: ${manifest.files.length} files match their checksums`);
  process.exit(bad ? 1 : 0);
}

if (process.argv[2] === "--verify") await verify(process.argv[3] ?? (() => { throw new Error("usage: --verify <backup dir>"); })());

const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, HUB_OWNER_EMAIL: email, HUB_OWNER_PASSWORD: password, HUB_OWNER_TOTP: totp } = process.env;
if (!url || !key || !email || !password) { console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, HUB_OWNER_EMAIL, HUB_OWNER_PASSWORD (and HUB_OWNER_TOTP if two-step is on)."); process.exit(2); }

const db = createClient(url, key, { auth: { persistSession: false } });
const { error: se } = await db.auth.signInWithPassword({ email, password });
if (se) { console.error("Sign-in failed:", se.message); process.exit(2); }
const { data: lvl } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
if (lvl?.nextLevel === "aal2" && lvl.currentLevel !== "aal2") {
  if (!totp) { console.error("Two-step verification is on: set HUB_OWNER_TOTP to the current 6-digit code."); process.exit(2); }
  const { data: f } = await db.auth.mfa.listFactors();
  const factor = f.totp.find((x) => x.status === "verified");
  const { data: ch } = await db.auth.mfa.challenge({ factorId: factor.id });
  const { error: ve } = await db.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: totp });
  if (ve) { console.error("Two-step code rejected."); process.exit(2); }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.join("backups", stamp);
await mkdir(path.join(dir, "files"), { recursive: true });

const dump = {};
for (const t of ["profiles", "projects", "files", "releases", "activity_log"]) {
  const rows = []; // page through so large tables are never silently truncated at 1000 rows
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(t).select("*").range(from, from + 999);
    if (error) { console.error(`Could not read ${t}: ${error.message}`); process.exit(1); }
    rows.push(...data); if (data.length < 1000) break;
  }
  dump[t] = rows;
  await writeFile(path.join(dir, `${t}.json`), JSON.stringify(rows, null, 2));
  console.log(`exported ${rows.length} ${t}`);
}

const manifest = { created_at: new Date().toISOString(), source: url, files: [] };
const failures = [];
for (const f of dump.files) {
  const rel = f.storage_key; // randomized key; original names live in files.json
  try {
    const { data: signed, error } = await db.storage.from("hub-files").createSignedUrl(f.storage_key, 300);
    if (error) throw new Error(error.message);
    const r = await fetch(signed.signedUrl); if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const got = createHash("sha256").update(buf).digest("hex");
    if (buf.length !== Number(f.file_size)) throw new Error(`size ${buf.length} != recorded ${f.file_size}`);
    if (f.checksum && got !== f.checksum) throw new Error("checksum differs from the one recorded at upload");
    const out = path.join(dir, "files", rel); await mkdir(path.dirname(out), { recursive: true }); await writeFile(out, buf);
    manifest.files.push({ id: f.id, path: rel, original_filename: f.original_filename, size: buf.length, sha256: got });
  } catch (e) { failures.push(`${f.original_filename} (${f.id}): ${e.message}`); }
}
await writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeFile(path.join(dir, "SHA256SUMS"), manifest.files.map((m) => `${m.sha256}  files/${m.path}`).join("\n") + "\n");

if (failures.length) {
  await writeFile(path.join(dir, "FAILED.txt"), failures.join("\n") + "\n");
  console.error(`BACKUP INCOMPLETE: ${failures.length} file(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`BACKUP OK: ${dump.projects.length} projects, ${manifest.files.length} files verified -> ${dir}`);
console.log("Next: copy this folder to a second location (external drive / another cloud). A copy on the same machine is not a backup.");
