import "server-only";
import { unzipSync } from "fflate";

export interface ApkInfo { packageName: string; versionName: string; versionCode: string; label: string | null; permissions: string[]; minSdk: string; targetSdk: string; icon: Uint8Array | null; iconName: string | null }

/** Minimal Android binary-XML (AXML) reader: just enough to pull attributes off AndroidManifest.xml. */
function parseManifest(buf: Uint8Array) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint16(0, true) !== 0x0003) throw new Error("Not a binary manifest");
  let off = dv.getUint16(2, true);
  let strings: string[] = [];
  const els: { name: string; attrs: Record<string, string> }[] = [];
  const readStr = (i: number) => (i === 0xffffffff || i < 0 ? "" : strings[i] ?? "");
  while (off + 8 <= buf.length) {
    const type = dv.getUint16(off, true), hs = dv.getUint16(off + 2, true), size = dv.getUint32(off + 4, true);
    if (size < 8) break;
    if (type === 0x0001) {
      const n = dv.getUint32(off + 8, true), flags = dv.getUint32(off + 16, true), sStart = dv.getUint32(off + 20, true);
      const utf8 = (flags & 0x100) !== 0;
      strings = [];
      for (let i = 0; i < n; i++) {
        let p = off + sStart + dv.getUint32(off + hs + i * 4, true);
        if (utf8) {
          let l = buf[p++]; if (l & 0x80) p++;
          let bl = buf[p++]; if (bl & 0x80) { bl = ((bl & 0x7f) << 8) | buf[p++]; }
          strings.push(new TextDecoder().decode(buf.subarray(p, p + bl)));
        } else {
          let l = dv.getUint16(p, true); p += 2;
          if (l & 0x8000) { l = ((l & 0x7fff) << 16) | dv.getUint16(p, true); p += 2; }
          strings.push(new TextDecoder("utf-16le").decode(buf.subarray(p, p + l * 2)));
        }
      }
    } else if (type === 0x0102) {
      const nameIdx = dv.getUint32(off + 20, true), attrStart = dv.getUint16(off + 24, true), attrSize = dv.getUint16(off + 26, true), count = dv.getUint16(off + 28, true);
      const attrs: Record<string, string> = {};
      for (let i = 0; i < count; i++) {
        const a = off + 16 + attrStart + i * attrSize;
        const an = readStr(dv.getUint32(a + 4, true));
        const raw = dv.getUint32(a + 8, true), dt = buf[a + 15], data = dv.getUint32(a + 16, true);
        attrs[an] = dt === 0x03 ? readStr(raw === 0xffffffff ? data : raw) : dt === 0x01 ? `@res:${data.toString(16)}` : dt === 0x10 ? String(data | 0) : raw !== 0xffffffff ? readStr(raw) : String(data);
      }
      els.push({ name: readStr(nameIdx), attrs });
    }
    off += size;
  }
  return els;
}

export function readApk(bytes: Uint8Array): ApkInfo {
  const files = unzipSync(bytes, { filter: (f) => f.name === "AndroidManifest.xml" || /^res\/(mipmap|drawable)[^/]*\/[^/]+\.png$/i.test(f.name) });
  const man = files["AndroidManifest.xml"];
  if (!man) throw new Error("This file does not look like an APK (no AndroidManifest.xml).");
  const els = parseManifest(man);
  const m = els.find((e) => e.name === "manifest")?.attrs ?? {};
  const app = els.find((e) => e.name === "application")?.attrs ?? {};
  const sdk = els.find((e) => e.name === "uses-sdk")?.attrs ?? {};
  const permissions = els.filter((e) => e.name === "uses-permission").map((e) => e.attrs.name).filter(Boolean);
  const label = app.label && !app.label.startsWith("@res:") ? app.label : null;
  // Pick the best launcher-like PNG: prefer ic_launcher / icon names, then the largest file.
  const pngs = Object.entries(files).filter(([n]) => n !== "AndroidManifest.xml");
  const score = (n: string, size: number) => (/ic_launcher(?!_foreground|_background|_monochrome)/i.test(n) ? 1e9 : /(^|\/)(icon|app_icon|logo)[^/]*\.png$/i.test(n) ? 5e8 : /foreground/i.test(n) ? 1e8 : 0) + size;
  const best = pngs.sort((a, b) => score(b[0], b[1].length) - score(a[0], a[1].length))[0];
  return {
    packageName: m.package ?? "", versionName: m.versionName ?? "", versionCode: m.versionCode ?? "", label, permissions,
    minSdk: sdk.minSdkVersion ?? "", targetSdk: sdk.targetSdkVersion ?? "", icon: best?.[1] ?? null, iconName: best?.[0] ?? null,
  };
}

const PERM_FEATURES: [RegExp, string][] = [
  [/\.CAMERA$/, "Uses the camera"], [/RECORD_AUDIO$/, "Uses the microphone"], [/ACCESS_(FINE|COARSE)_LOCATION$/, "Location-aware"],
  [/BLUETOOTH/, "Bluetooth support"], [/POST_NOTIFICATIONS$/, "Notifications"], [/\.INTERNET$/, "Works online"], [/VIBRATE$/, "Haptic feedback"], [/NFC$/, "NFC support"],
];
export function apkFeatures(p: string[]): string[] { return PERM_FEATURES.filter(([re]) => p.some((x) => re.test(x))).map(([, f]) => f); }

export function prettyName(raw: string): string {
  return raw.replace(/\.apk$/i, "").replace(/[-_.]+/g, " ").replace(/\b(release|debug|signed|aligned|v?\d+(\.\d+)+|arm64|armeabi|universal)\b/gi, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
