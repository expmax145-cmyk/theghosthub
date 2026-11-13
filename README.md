# Personal Innovation Hub

Two screens, one codebase:

| Screen | Where | Who |
| --- | --- | --- |
| **Public Showcase** | `/` (project detail opens as an overlay, shareable as `/?p=<slug>`) | Anyone |
| **Private Creator Dashboard** | `/studio` (sign-in, projects, file manager, editor, settings all live here) | Owner only |

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, Storage). Runtime dependencies: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `tus-js-client`, two self-hosted font packages. No UI kit, no state library, no service-role key anywhere.

## Quick start

1. Follow [docs/SETUP.md](docs/SETUP.md) (about 15 minutes: Supabase project → run one SQL file → create your user → env vars).
2. `npm install && npm run dev`

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Production build |
| `npm test` | Unit tests (validation, slugs, URL safety, key generation) |
| `npm run test:rls` | Runs the real migration on a throwaway local PostgreSQL and asserts 57 access rules |
| `npm run backup` | Full backup (rows + every file) with checksum verification |
| `npm run backup:verify -- backups/<folder>` | Re-hashes a backup against its manifest, offline |

## Docs

- [SETUP.md](docs/SETUP.md): accounts, database, owner account, env vars, local run
- [DEPLOY.md](docs/DEPLOY.md): hosting options and the Vercel Hobby licensing caveat
- [SECURITY.md](docs/SECURITY.md): the security model and what is / is not verified
- [BACKUP.md](docs/BACKUP.md): backup, verification and restore procedure
- [LIMITS.md](docs/LIMITS.md): free-tier numbers checked on 2026-11-11 and what happens at each limit
