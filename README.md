# Inter-University Swimming Championships 2026

Live team scoring for the meet. Officials upload one event result PDF, check the extracted table, then publish. Every open leaderboard updates without a refresh.

**Spectators** — no login. **Officials** — email/password only.

The production app is hosted on **Vercel** (open your project → **Domains** for the live URL). Making this GitHub repo public does **not** publish API keys; those stay in Vercel Environment Variables.

## Who should use public vs private

| Choice | Use when |
| --- | --- |
| **Public** (recommended for a student / portfolio project) | You want others to see the code. Keys are only in Vercel / `.env.local`. |
| **Private** | You do not want the source or sample result PDF on the open internet. |

`main` is the only branch and should stay the **default**. Vercel already deploys from `main`.

**Never put in the README or in git:** database password, `service_role` key, OpenAI/Anthropic keys, official login password.

## Live site

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → **swim-scoring-app**.
2. Copy the Production URL (usually `https://….vercel.app`).
3. On GitHub: repo **About** (gear icon) → paste that URL as the **Website**.

Public pages: `/` leaderboard · `/schedule` programme · `/login` officials.

## Features

- Leaderboard tabs: **Overall | Men | Women** (overall = Men + Women per university)
- Schedule Day 1 / Day 2; posted events show top 6, medals, points
- Officials: PDF upload → AI extract (OpenAI or Anthropic) → review → **Confirm & Publish**
- Replace-not-stack if a result is corrected (e.g. DQ)
- Unknown team codes cannot be published
- Audit log with the original PDF

## Points

| Place | Individual | Relay |
| --- | --- | --- |
| 1 | 7 | 10 |
| 2 | 5 | 7 |
| 3 | 4 | 5 |
| 4 | 3 | 3 |
| 5 | 2 | 2 |
| 6 | 1 | 1 |

Only **finished** places 1–6 score. DNS / DQ / DNF / NS / WD = 0. Ties break on count-back (more 1sts, then 2nds, …).

## Stack

Next.js (App Router) · Supabase (Postgres, Auth, Storage, Realtime) · OpenAI or Anthropic for PDF extraction · Vercel

## Local setup

```bash
git clone https://github.com/ThevinduFernando2003/Swim-scoring-App.git
cd Swim-scoring-App
npm install
cp .env.example .env.local
```

Fill `.env.local` (see `.env.example`). In the [Supabase](https://supabase.com) SQL editor run `supabase/schema.sql` then `supabase/seed.sql`. Create an official user under **Authentication → Users**.

```bash
npm run dev
```

- http://localhost:3000 — leaderboard  
- http://localhost:3000/login — officials  
- Development only: **Load Event 5 fixture** (not shown on Vercel)

```bash
npm test
```

## Environment variables

| Name | Public in browser? | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key; RLS must stay on |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Vercel / `.env.local` only |
| `OPENAI_API_KEY` | **No** | PDF extract (this project’s default) |
| `OPENAI_MODEL` | No | e.g. `gpt-4o` |
| `ANTHROPIC_API_KEY` | **No** | Optional; leave empty if using OpenAI |
| `ANTHROPIC_MODEL` | No | Optional |

On Vercel: **Settings → Environment Variables** → Production and Preview. After changing keys, **Redeploy**.

## Docs

| Doc | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data model, RLS, realtime |
| [docs/PDF-PIPELINE.md](docs/PDF-PIPELINE.md) | Upload → extract → review → publish |
| [docs/FEATURES.md](docs/FEATURES.md) | Screens and scoring rules |
| [docs/NEXT-STEPS.md](docs/NEXT-STEPS.md) | Supabase / Vercel checklist |

## Make the GitHub repo public

1. Confirm `.env.local` is **not** on GitHub (it is listed in `.gitignore`).
2. Repo → **Settings → General → Default branch** → `main`.
3. **Settings → General → Danger zone → Change repository visibility → Public**.
4. **About** (repo home, gear): description e.g. `Live scoring for IUSC 2026`, website = Vercel URL, topics: `nextjs`, `supabase`, `swimming`.
5. Optional: **Settings → Rules → Rulesets** to protect `main` (require pull requests) — not required for a solo meet project.

Vercel keeps working. A public repo only shows source code; it does not show Vercel secrets or let strangers publish scores unless they have an official login.

## After it is public

- Supabase → Authentication → disable public sign-up (only invited officials).
- Do not write official passwords in issues or the README.
- If keys were ever pasted in chat or a screenshot, **rotate** them in Supabase / OpenAI and update Vercel.
- Sample sheet: `Results/DAY 01 - EVENT 05.pdf`.

## License

[MIT](LICENSE) © 2026 Thevindu Fernando
