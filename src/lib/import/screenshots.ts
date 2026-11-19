import "server-only";
import { assertPublicUrl } from "./safe-fetch";

export interface Shot { label: string; bytes: Uint8Array }

/**
 * Real-browser screenshots (desktop, mobile, and a tall full-page capture used for the preview video).
 * Uses @sparticuz/chromium on Vercel, or CHROME_PATH locally. Throws when no browser is available.
 */
export async function captureScreens(url: string): Promise<{ images: Shot[]; title: string }> {
  const puppeteer = (await import("puppeteer-core")).default;
  let executablePath = process.env.CHROME_PATH;
  let args: string[] = ["--no-sandbox", "--disable-gpu"];
  if (!executablePath) {
    const chromium = (await import("@sparticuz/chromium")).default;
    executablePath = await chromium.executablePath();
    args = chromium.args;
  }
  const browser = await puppeteer.launch({ executablePath, args, headless: true });
  try {
    const out: Shot[] = [];
    const page = await browser.newPage();
    // Every request the page makes is checked, so a page cannot be used to reach private addresses.
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const u = r.url();
      if (u.startsWith("data:") || u.startsWith("blob:")) return void r.continue();
      assertPublicUrl(u).then(() => r.continue(), () => r.abort());
    });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 25_000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    const title = await page.title().catch(() => "");
    out.push({ label: "desktop", bytes: await page.screenshot({ type: "jpeg", quality: 80 }) });
    // Scroll once so lazy content loads, then capture a tall page (capped) for the scrolling preview video.
    await page.evaluate(async () => { for (let y = 0; y < 6000; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); }).catch(() => {});
    const h = Math.min(await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 900), 5400);
    if (h > 1200) {
      await page.setViewport({ width: 1280, height: h });
      out.push({ label: "fullpage", bytes: await page.screenshot({ type: "jpeg", quality: 70 }) });
      await page.setViewport({ width: 1440, height: 900 });
    }
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20_000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 800));
    out.push({ label: "mobile", bytes: await page.screenshot({ type: "jpeg", quality: 80 }) });
    return { images: out, title };
  } finally { await browser.close().catch(() => {}); }
}
