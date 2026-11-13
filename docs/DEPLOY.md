# Deploy

Nothing has been deployed by the builder: that needs your accounts and your approval.

## Option A: Vercel (simplest for Next.js)

1. Push this folder to a GitHub repository (`.env.local` is git-ignored).
2. Import the repo on vercel.com. Framework is detected automatically.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` variables in Project Settings → Environment Variables.
4. Deploy, then add the production URL to Supabase *Site URL* and *Redirect URLs* (see SETUP.md step 2.3).

**Licensing caveat:** Vercel's Hobby plan is for personal, non-commercial use. A personal portfolio fits. If you later sell downloads, take client work or monetise, Hobby no longer applies and the next tier is paid. In that case Netlify or Cloudflare Pages are the usual free alternatives; the app has no Vercel-specific code.

## Option B: any Node host

`npm run build && npm start` runs it anywhere Node 20+ is available.

## After deploying: verify

- `/` loads and shows only published projects.
- `/studio` shows the sign-in form; sign in works; sign out works.
- In a private window, open `/studio`: you must see only the sign-in form.
- Publish a test project, then unpublish it and confirm it disappears from `/`.
- Upload a small file, download it from the file manager, and confirm the checksum shown matches `sha256sum` of the original.
