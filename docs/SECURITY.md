# Security model

## Authorisation
- Owner-only is enforced **in the database**, not the UI. `public.is_owner()` is checked by every write policy. The first user to exist is the owner; a unique index forbids a second one.
- If the owner enrols TOTP, `is_owner()` additionally requires an `aal2` session, so a stolen password alone opens nothing.
- `/studio` re-checks `auth.getUser()` (validated against the auth server) and `is_owner()` on every request. `proxy.ts` only refreshes the session cookie; it is not a security boundary.
- Anonymous visitors use the `anon` role with an explicit **column allow-list**. `repository_url`, `owner_id`, `is_owner`, the audit log and all non-published rows are unreachable. A repo link is exposed only through the generated `public_repository_url`, which is NULL unless you tick "Show publicly".

## Files
- Bucket `hub-files` is **private**. Objects have random keys (no filenames, no guessable paths).
- Visitors never get a storage URL directly. Images/video preview use 1-hour signed URLs created per request; downloads go through `/api/download/<id>`, which only resolves for a file marked public whose project is published, then redirects to a 60-second signed URL.
- Unpublishing stops new URLs immediately. URLs already issued remain valid until they expire (up to 1 hour for media).
- Uploads are validated by an extension allow-list, a size cap and per-role rules; SVG is never rendered inline; SHA-256 is computed before upload and stored; the stored size is compared after upload.

## Other
- Security headers (CSP, frame-ancestors none, nosniff, HSTS, referrer, permissions policy) in `next.config.ts`; `/studio` is `no-store` and `noindex`.
- Inputs validated twice: in the form and by database CHECK constraints (URL scheme must be http/https, slug format, lengths).
- Audit log is written by database triggers; nobody can insert into it from a client.
- No secrets in browser code: only the publishable key is used. No service-role key exists in the project.
- Rate limiting: Supabase Auth rate-limits sign-in. The download route has a small in-memory limiter that is **per server instance** (best effort on serverless).

## What has and has not been verified
**Verified by running it:** `npm run test:rls` applies the real migration to a throwaway PostgreSQL 16 and passes 57 assertions: anonymous and stranger access, drafts/archived/private files hidden, column grants, unpublish revokes access, MFA lock-out without aal2, forged owner IDs, cross-owner file attachment, bad URLs/slugs/checksums, audit-log forgery. Unit tests cover validation. A production build succeeds. The public UI was exercised in a browser at 1280 px and 390 px (filters, search, overlay, deep link, no horizontal overflow, no console errors).

**Not verified (needs your Supabase project):** the harness stubs Supabase's `auth` and `storage` schemas, so it proves the policies' logic but not Supabase's own JWT/storage plumbing. The sign-in flow, password-recovery email, TOTP enrolment, resumable uploads, signed URLs and the dashboard's mutations have **not** been run against a live Supabase. Run the checklist in DEPLOY.md after setup, and tell me what breaks.
