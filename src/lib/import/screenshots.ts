import "server-only";
import { assertPublicUrl } from "./safe-fetch";

export interface Shot { label: string; bytes: Uint8Array }

/**
 * Real-browser screenshots (desktop, mobile, and a tall full-page capture used for the preview video).
 * Uses @sparticuz/chromium on Vercel, or CHROME_PATH locally. Throws when no browser is available.
 */
export async function captureScreens(url: string, budgetMs = 30_000): Promise<{ images: Shot[]; title: string }> {
  const puppeteer = (await import("puppeteer-core")).default;
  let executablePath = process.env.CHROME_PATH;
  let args: string[] = ["--no-sandbox", "--disable-gpu"];
  if (!executablePath) {
    const chromium = (await import("@sparticuz/chromium")).default;
    executablePath = await chromium.executablePath();
    args = chromium.args;
  }
  const started = Date.now();
  const left = () => budgetMs - (Date.now() - started);
  const launching = puppeteer.launch({ executablePath, args, headless: true });
  const browser = await Promise.race([launching, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("the browser took too long to start")), Math.min(18_000, budgetMs - 4000)))])
    .catch((e) => { launching.then((b) => b.close()).catch(() => {}); throw e; });
  // Hard stop: closing the browser makes every pending step below throw, so the caller never hangs past its budget.
  const killer = setTimeout(() => { browser.close().catch(() => {}); }, Math.max(1000, left()));
  const out: Shot[] = [];
  let title = "";
  try {
    const page = await browser.newPage();
    // Every request the page makes is checked, so a page cannot be used to reach private addresses.
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const u = r.url();
      if (u.startsWith("data:") || u.startsWith("blob:")) return void r.continue();
      assertPublicUrl(u).then(() => r.continue(), () => r.abort());
    });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: "load", timeout: Math.min(14_000, Math.max(3000, left() - 2000)) }).catch(() => {});
    await new Promise((r) => setTimeout(r, 900));
    title = await page.title().catch(() => "");
    out.push({ label: "desktop", bytes: await page.screenshot({ type: "jpeg", quality: 72 }) });
    // Scroll once so lazy content loads, then capture a tall page (capped) for the scrolling preview video.
    await page.evaluate(async () => { for (let y = 0; y < 6000; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); }).catch(() => {});
    const h = Math.min(await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 900), 5400);
    if (h > 1200 && left() > 14_000) {
      await page.setViewport({ width: 1280, height: h });
      out.push({ label: "fullpage", bytes: await page.screenshot({ type: "jpeg", quality: 55 }) });
      await page.setViewport({ width: 1440, height: 900 });
    }
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: "load", timeout: Math.min(10_000, Math.max(2000, left() - 1500)) }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    out.push({ label: "mobile", bytes: await page.screenshot({ type: "jpeg", quality: 80 }) });
    return { images: out, title };
  } catch (e) {
    // Out of time or the page crashed: keep whatever was captured so far.
    if (out.length) return { images: out, title };
    throw e;
  } finally { clearTimeout(killer); await browser.close().catch(() => {}); }
}
