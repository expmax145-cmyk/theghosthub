# Backup and recovery

**Synchronisation is not backup.** Supabase holds your working copy. If you delete a file or project there, nothing restores it. The Free plan includes no automatic backups. Keep this rule: **working copy + independent cloud copy + offline copy.**

## Make a backup

```
# one-off, from your own computer (never on the server)
export NEXT_PUBLIC_SUPABASE_URL=...
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
export HUB_OWNER_EMAIL=you@example.com
export HUB_OWNER_PASSWORD=...
export HUB_OWNER_TOTP=123456     # only if two-step verification is on
npm run backup
```

It creates `backups/<timestamp>/` containing every table as JSON, every stored file under `files/`, `manifest.json` and a standard `SHA256SUMS`. For each file it checks the downloaded size and SHA-256 against what was recorded at upload. **If any file fails, it prints `BACKUP INCOMPLETE`, writes `FAILED.txt` and exits non-zero. Only `BACKUP OK` means success.**

## Verify later (works offline)

```
npm run backup:verify -- backups/2026-11-12T...
```

Re-hashes every file against the manifest. Run it after copying the folder to another drive.

## Where the other copies go

1. **Independent cloud copy:** upload the backup folder to Google Drive / MEGA / another bucket by hand or with their desktop sync app. (Those consumer services were not integrated into the app on purpose: their APIs and terms are not designed for safe app-level access.)
2. **Offline copy:** copy to an external drive. Run `backup:verify` against that copy.
3. **Source code:** your GitHub repository is the history for code. Keep game/app source archives as project attachments *and* in Git.

Suggested rhythm: after every batch of uploads, and at least monthly.

## Restore

*Files:* each file in `files/` is named by its storage key; `files.json` maps keys to original names. Upload one with the dashboard (it re-validates and re-hashes), or place the objects back in the `hub-files` bucket under the same keys.

*Database into a fresh Supabase project:*
1. Run `supabase/migrations/0001_init.sql`, create your owner user (SETUP.md step 2).
2. The rows in `projects.json`, `files.json`, `releases.json` carry the old `owner_id`; replace it with your new user id (`select id from auth.users`) before importing, using the SQL editor or Table Editor → Import CSV/JSON.
3. Restore the objects under the same `storage_key`s so `files` rows resolve.
4. Sign in and spot-check: project count, a download, a checksum.

A restore has **not** been rehearsed against a live Supabase project by the builder; do one dry run now while the data is small so you know it works.
