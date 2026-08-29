# Inter-University Swimming Championships 2026 — Live Scoring

Next.js app for meet officials to upload one event result PDF, review the extracted table, publish points, and push live standings to every open leaderboard tab.

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, repo layout, data model, RLS, realtime, hosting |
| [docs/PDF-PIPELINE.md](docs/PDF-PIPELINE.md) | Exact path from PDF drop → Claude → review → publish → live board |
| [docs/FEATURES.md](docs/FEATURES.md) | Spectator and official features, scoring rules, meet-day processes |
| [docs/NEXT-STEPS.md](docs/NEXT-STEPS.md) | Supabase, Auth, Anthropic, Vercel, and go-live checklist |

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, Storage, Realtime)
- Anthropic Claude (PDF → JSON extraction)

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

## Quick start

```bash
npm install
cp .env.example .env.local
# fill keys, then run SQL in Supabase (schema.sql then seed.sql)
npm run dev
```

- Public leaderboard: http://localhost:3000
- Schedule: http://localhost:3000/schedule
- Admin: http://localhost:3000/login

In development, the upload screen includes **Load Event 5 fixture** so you can confirm scoring without an Anthropic key.

```bash
npm test
```

Full setup and deploy: [docs/NEXT-STEPS.md](docs/NEXT-STEPS.md).

## Meet-day flow

1. Official signs in and picks an event.
2. Uploads that event’s result PDF (Claude extracts name, team, place, time/status).
3. Reviews the table. Unknown team codes are highlighted and block publish.
4. **Confirm & Publish** writes points (positions 1–6, `finished` only) and flips the event to confirmed.
5. Open leaderboard tabs update immediately via Supabase Realtime.
6. To correct a DQ after the fact, reopen the event, edit the row, tick **Replace existing result**, and publish again. Points are rebuilt for that event, never stacked.

## Points

| Place | Individual | Relay |
| --- | --- | --- |
| 1 | 7 | 10 |
| 2 | 5 | 7 |
| 3 | 4 | 5 |
| 4 | 3 | 3 |
| 5 | 2 | 2 |
| 6 | 1 | 1 |

DNS / DQ / DNF / NS / WD score 0. Overall standings = Men + Women for that university. Ties break on count-back (more 1sts, then 2nds, … 6ths).
