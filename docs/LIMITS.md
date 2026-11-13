# Free-tier limits (checked 2026-11-11)

Sources: supabase.com/pricing, Vercel pricing/fair-use pages and third-party summaries, developers.cloudflare.com/r2/pricing. Providers change these; re-check before relying on them. Nothing here is unlimited or permanent.

| Service | Free allowance | What it means for the hub |
| --- | --- | --- |
| Supabase Free | 500 MB database, **1 GB file storage**, 5 GB egress, 50,000 MAU, **50 MB max file**, 2 active projects | The hub's real ceiling is **1 GB of files** and **50 MB per file**. A large APK or game build will not fit; store those on GitHub Releases or Drive and add the link. |
| Supabase Free: pausing | Projects **pause after 1 week of inactivity** | The site goes down until you resume it in the dashboard. The keepalive workflow mitigates this. Free projects also have **no automatic backups**, so use `npm run backup`. |
| Vercel Hobby | ~100 GB bandwidth, ~1M edge requests, 100K function invocations, **personal, non-commercial use only** | Fine for a personal portfolio. If the site starts earning money or serves clients, Hobby's terms no longer apply. See DEPLOY.md. |
| Cloudflare R2 (optional later) | 10 GB storage, 1M writes, 10M reads / month, zero egress fees; **needs a payment method on file to activate** | Not used by default. It is the upgrade path for bigger files; the storage layer (`src/lib/storage.ts`) is written so a second provider can be added. Per your zero-cost rule it must not be switched on without your approval. |

The dashboard shows storage used against the 1 GB quota, and uploads over 50 MB are rejected with an explanation before they start. Both numbers are configurable via env if you move to a paid plan.
