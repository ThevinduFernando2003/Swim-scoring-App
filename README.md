# Swim scoring platform

Multi-meet live scoring for swimming championships. Officials upload one event result PDF, check the extracted table, then publish. Every open leaderboard updates without a refresh.

**Public** — no login: meet directory, standings, schedule, swimmer profiles, original PDFs.  
**Officials / meet admins** — email/password. **Super admin** — create meets and branding.

The production app is hosted on **Vercel**. Making this GitHub repo public does **not** publish API keys; those stay in Vercel Environment Variables.

## Live site

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → **swim-scoring-app**.
2. Copy the Production URL (usually `https://….vercel.app`).
3. Optional custom domain: Vercel → **Domains** → add the hostname, then add the DNS records Vercel shows. No code change.

Public pages: `/` meet list · `/meets/[slug]` leaderboard · `/login` officials.

## Features

- Unlimited meets (draft → live → completed), each with its own teams, schedule, and points table
- Leaderboard tabs from the genders actually in that meet, plus top individual scorers
- Swimmer search and per-swimmer history
- Officials: PDF upload → AI extract (OpenAI or Anthropic) → review (including near-duplicate names) → **Confirm & Publish**
- Replace-not-stack if a result is corrected
- Public **View original PDF** on each confirmed event
- CSV standings / event results; admin JSON export of a full meet
- Organisation name, logo, and colour (Super Admin → Branding)
- Per-meet colour, official logo, background, and sponsors (footer, header, or watermark)
- PDF import for teams/schools, entry roster, and the full schedule
- Tied clock times share a place (1=, 1=) and both score those points
- Morning prelims / evening finals: top 8 qualify (ties for last place all go through, plus two reserves)
- Seeded meet records; a faster published time is marked NMR and updates the board
- Day-one check-in: registered, SLASU confirmed, present (public search + desk ticks)
- Admin-set “next results expected at” time on public meet pages

## Points

Each meet has an editable table (any number of scoring places). Inter Uni ships with:

| Place | Individual | Relay |
| --- | --- | --- |
| 1 | 7 | 10 |
| 2 | 5 | 7 |
| 3 | 4 | 5 |
| 4 | 3 | 3 |
| 5 | 2 | 2 |
| 6 | 1 | 1 |

Only **finished** scoring places score. DNS / DQ / DNF / NS / WD = 0. Ties break on count-back (more 1sts, then 2nds, …). Changing points mid-meet asks whether to keep existing scores or recalculate.

## Stack

Next.js (App Router) · Supabase (Postgres, Auth, Storage, Realtime) · OpenAI or Anthropic for PDF extraction · Vercel

## Local setup

```bash
git clone https://github.com/ThevinduFernando2003/Swim-scoring-App.git
cd Swim-scoring-App
npm install
cp .env.example .env.local
```

Fill `.env.local` (see `.env.example`). In the [Supabase](https://supabase.com) SQL editor:

1. **New project:** `supabase/schema.sql` then `supabase/seed.sql` then `supabase/migration_v2.sql` then `supabase/migration_v3.sql`
2. **Existing live database:** run **only** `supabase/migration_v2.sql` (keeps Inter Uni results as meet `inter-uni-2026`), then `migration_v3.sql`, `migration_v4.sql`, and `migration_v5.sql`

Create an official user under **Authentication → Users**. The migration promotes `admin@gmail.com` to super admin if that user exists.

```bash
npm run dev
```

- http://localhost:3000 — meet directory  
- http://localhost:3000/login — officials  
- Development only: **Load Event 5 fixture** (not shown on Vercel)

```bash
npm test
npm run check-secrets
```

## Environment variables

| Name | Public in browser? | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key; RLS must stay on |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Invites and signed PDFs |
| `OPENAI_API_KEY` | **No** | PDF extract (this project’s default) |
| `OPENAI_MODEL` | No | e.g. `gpt-4o` |
| `ANTHROPIC_API_KEY` | **No** | Optional; leave empty if using OpenAI |
| `ANTHROPIC_MODEL` | No | Optional |

On Vercel: **Settings → Environment Variables** → Production and Preview. After changing keys, **Redeploy**.

**Never put in the README or in git:** database password, `service_role` key, OpenAI/Anthropic keys, official login password.

## Docs

| Doc | Contents |
| --- | --- |
| [docs/RUNNING_A_MEET.md](docs/RUNNING_A_MEET.md) | Non-technical operator guide |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | If the site or database is down |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Transfer GitHub, Vercel, Supabase, API billing |
| [docs/SUPPORT.md](docs/SUPPORT.md) | Who fixes bugs after handover (agree in writing) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data model (v1); see `migration_v2.sql` for v2 |
| [docs/PDF-PIPELINE.md](docs/PDF-PIPELINE.md) | Upload → extract → review → publish |

## License

[MIT](LICENSE) © 2026 Thevindu Fernando
