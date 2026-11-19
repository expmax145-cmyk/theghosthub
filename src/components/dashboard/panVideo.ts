/** Renders a smooth scrolling "tour" video (WebM) from a tall page screenshot, entirely in the browser. */
export async function makePanVideo(blob: Blob, seconds = 8): Promise<File | null> {
  if (typeof MediaRecorder === "undefined") return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const W = 1280, H = 720;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx || !(canvas as HTMLCanvasElement).captureStream) return null;
    const scale = W / img.width;
    const drawH = img.height * scale;
    const tall = drawH > H * 1.3;
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    if (!mime) return null;
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start(250);
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const t = Math.min((now - t0) / (seconds * 1000), 1);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
        ctx.fillStyle = "#06101c"; ctx.fillRect(0, 0, W, H);
        if (tall) {
          const sy = (img.height - H / scale) * e;
          ctx.drawImage(img, 0, sy, img.width, H / scale, 0, 0, W, H);
        } else {
          const z = 1 + 0.12 * e, w = img.width / z, h = (w * H) / W;
          ctx.drawImage(img, (img.width - w) / 2, 0, w, Math.min(h, img.height), 0, 0, W, H);
        }
        if (t < 1) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    rec.stop();
    await done;
    const out = new Blob(chunks, { type: "video/webm" });
    return out.size > 1000 ? new File([out], "preview-tour.webm", { type: "video/webm" }) : null;
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}
