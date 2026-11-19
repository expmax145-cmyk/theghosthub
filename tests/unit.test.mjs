import test from "node:test";
import assert from "node:assert/strict";
import { slugify, formatBytes, safeUrl, splitList } from "../src/lib/utils.ts";
import { validateFile, randomKey, extOf, isInlineImage } from "../src/lib/files.ts";

test("slugify", () => {
  assert.equal(slugify("Apex Horizon 3D!"), "apex-horizon-3d");
  assert.equal(slugify("  Café  Déjà vu "), "cafe-deja-vu");
  assert.equal(slugify("***"), "untitled");
  assert.ok(slugify("a".repeat(200)).length <= 80);
});
test("safeUrl only allows http(s)", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,<script>"), null);
  assert.equal(safeUrl("ftp://x.y"), null);
  assert.equal(safeUrl("not a url"), null);
  assert.ok(safeUrl("https://example.com/a"));
});
test("formatBytes", () => { assert.equal(formatBytes(0), "0 B"); assert.equal(formatBytes(1536), "1.5 KB"); assert.equal(formatBytes(52428800), "50.0 MB"); });
test("splitList dedupes and trims", () => assert.deepEqual(splitList("Unity, c#,\n unity , "), ["Unity", "c#"]));
test("validateFile: allow-list, limits and role rules", () => {
  assert.equal(validateFile({ name: "app.apk", size: 10 }, "attachment").ok, true);
  assert.equal(validateFile({ name: "run.sh", size: 10 }, "attachment").ok, false);
  assert.equal(validateFile({ name: "noext", size: 10 }, "attachment").ok, false);
  assert.equal(validateFile({ name: "a.zip", size: 0 }, "attachment").ok, false);
  const big = validateFile({ name: "a.zip", size: 60 * 1048576 }, "attachment");
  assert.equal(big.ok, false); assert.match(big.error, /50 MB/);
  assert.equal(validateFile({ name: "x.zip", size: 5 }, "thumbnail").ok, false);
  assert.equal(validateFile({ name: "x.svg", size: 5 }, "screenshot").ok, false);
  assert.equal(validateFile({ name: "x.png", size: 5 }, "screenshot").ok, true);
  assert.equal(validateFile({ name: "v.mp4", size: 5 }, "video").ok, true);
  assert.equal(validateFile({ name: "v.png", size: 5 }, "video").ok, false);
});
test("randomKey is unguessable and leaks no filename", () => {
  const a = randomKey("apk"), b = randomKey("apk");
  assert.notEqual(a, b); assert.match(a, /^\d{4}\/\d{2}\/[0-9a-f]{36}\.apk$/);
});
test("SVG is never rendered inline", () => { assert.equal(isInlineImage("image/svg+xml"), false); assert.equal(isInlineImage("image/png"), true); assert.equal(extOf("A.B.PNG"), "png"); });

import { analyzeHtml, guessCategory, decode } from "../src/lib/import/analyze.ts";

test("import: analyzeHtml extracts name, description, tech, images, links", () => {
  const html = `<html><head><title>Pixel Racer | Free game</title><meta name="description" content="A fast racing game &amp; more."><meta property="og:image" content="/og.png"><script src="/phaser.min.js"></script></head><body><h1>Pixel Racer</h1><ul><li>Eight unlockable cars with handling</li></ul><a href="https://github.com/a/b">code</a></body></html>`;
  const d = analyzeHtml(html, "https://example.com/play", ["Games", "Websites"]);
  assert.equal(d.name, "Pixel Racer");
  assert.equal(d.short_description, "A fast racing game & more.");
  assert.equal(d.category, "Games");
  assert.ok(d.technologies.includes("Phaser"));
  assert.equal(d.imageCandidates[0], "https://example.com/og.png");
  assert.deepEqual(d.links, [{ label: "GitHub", url: "https://github.com/a/b" }]);
  assert.deepEqual(d.features, ["Eight unlockable cars with handling"]);
});
test("import: decode + category fallback", () => {
  assert.equal(decode("a &amp; b &#33; &#x41;"), "a & b ! A");
  assert.equal(guessCategory("a plain page", [], false, ["Websites"]), "Websites");
  assert.equal(guessCategory("my app", [], true, ["Android Applications"]), "Android Applications");
});
