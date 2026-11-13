# Setup

## 1. Create the Supabase project (free)

1. Sign up at supabase.com and create a project (Free plan). Pick the region closest to you (for India, Mumbai or Singapore).
2. **SQL Editor → New query**, paste the whole of `supabase/migrations/0001_init.sql`, run it. This creates the tables, Row Level Security policies, the private `hub-files` bucket and its storage policies.

## 2. Create YOUR account first, then close signups

The first account that exists becomes the owner. Nobody else can ever become the owner (enforced by a unique index).

1. **Authentication → Users → Add user → Create new user**. Use your email and a strong password (10+ characters); tick "Auto confirm".
2. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up".
   Do this right after step 1. Until then, a stranger could register, although they would still not be the owner.
3. **Authentication → URL Configuration**: set *Site URL* to your deployed address and add `https://YOUR-SITE/auth/callback` (and `http://localhost:3000/auth/callback` for local work) to *Redirect URLs*. Password recovery needs this.
4. Optional: in **Authentication → SMTP**, add your own mail sender. The built-in sender is rate-limited and only meant for testing.

## 3. Environment variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...            # Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...  # Project Settings → API Keys → publishable key
```

Only the **publishable** key is used. Never put the `service_role` / secret key anywhere in this project; it is not needed and the app is designed to work without it.

## 4. Run

```
npm install
npm run dev     # http://localhost:3000   (dashboard at /studio)
```

Sign in at `/studio`, click **Add new innovation**, save as draft, then **Publish**.

## 5. Optional hardening

- `/studio` → profile menu → **Settings & security** → turn on two-step verification (authenticator app). Once enrolled, the database itself refuses owner access to sessions that skipped the code.
- Set the repository variable `SITE_URL` so `.github/workflows/keepalive.yml` pings the site twice a week and stops the free database from pausing.
