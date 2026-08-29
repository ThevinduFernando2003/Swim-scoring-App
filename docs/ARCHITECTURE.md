# Architecture

This document describes how the Inter-University Swimming Championships 2026 live-scoring app is structured: layers, data model, security, realtime, and how requests move through the system.

Related docs:

- [PDF upload pipeline](./PDF-PIPELINE.md) — what happens when an official uploads a result sheet
- [Features and processes](./FEATURES.md) — product behaviour, scoring rules, screens
- [Next steps](./NEXT-STEPS.md) — what you must do after clone to go live

---

## 1. Purpose

Meet officials upload **one event result PDF at a time**. The app extracts places 1–6 (and later rows), a human reviews the table, then **Confirm & Publish** awards points to **universities** (not individual swimmers). Three live boards update in every open browser: **Overall**, **Men**, **Women**.

Spectators never log in. Officials share a small set of email/password accounts.

---

## 2. High-level system

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browsers                                │
│  Spectator: /  /schedule  /schedule/[id]                        │
│  Official:  /login  /admin  /admin/events/[id]  /admin/audit    │
└────────────┬───────────────────────────────┬────────────────────┘
             │ HTTPS (Vercel)                │
             ▼                               ▼
┌────────────────────────┐     ┌──────────────────────────────────┐
│ Next.js App Router     │     │ Supabase                         │
│ - React pages (SSR)    │────▶│ Postgres + RLS                   │
│ - API routes           │     │ Auth (email/password)            │
│ - proxy.ts (auth gate) │     │ Storage bucket result-pdfs       │
│                        │     │ Realtime on events, event_results│
└───────────┬────────────┘     └──────────────────────────────────┘
            │ server-only
            ▼
┌────────────────────────┐
│ Anthropic Claude API   │
│ PDF document → JSON    │
└────────────────────────┘
```

There is **no separate backend service**. Next.js on Vercel is the app server. Supabase is the database, login, file store, and live-update bus. Claude is only called from the authenticated extract API route.

---

## 3. Tech stack

| Layer | Choice | Role |
| --- | --- | --- |
| App | Next.js 16 App Router, TypeScript | Pages, API routes, SSR |
| UI | Tailwind CSS v4, small shadcn-style components | Scoreboard look (navy / gold) |
| Auth gate | `proxy.ts` (Next.js 16 replacement for middleware) | Redirect unauthenticated users away from `/admin` |
| Database | Supabase Postgres | Teams, events, results, uploads |
| Auth | Supabase Auth | Email + password for officials |
| Files | Supabase Storage `result-pdfs` | Original PDFs for audit |
| Live UI | Supabase Realtime | Leaderboard refreshes without a page reload |
| Extraction | Anthropic Messages API (`document` + PDF base64) | Turn a result sheet into JSON |
| Hosting | Vercel + Supabase | One git push deploys the app |

---

## 4. Repository layout

```
app/
  page.tsx                          Public leaderboard
  schedule/page.tsx                 Day 1 / Day 2 programme
  schedule/[eventId]/page.tsx       Top-6 result detail
  login/page.tsx                    Official sign-in
  admin/page.tsx                    Event dashboard
  admin/events/[eventId]/page.tsx   Upload + review + publish
  admin/audit/page.tsx              PDF audit log
  admin/layout.tsx                  Server-side auth check
  api/events/[eventId]/extract/     PDF → Claude → draft upload
  api/events/[eventId]/confirm/     Compute points + publish
  auth/signout/route.ts             Sign out
  error.tsx                         Friendly data-load error
components/                         UI + leaderboard + review table
lib/
  points.ts                         Points table
  publish.ts                        Map review rows → DB rows
  standings.ts                      Rank + count-back tiebreak
  extraction.ts                     Claude prompt + JSON parse
  supabase/                         Browser, server, admin clients
  data.ts                           Shared selects
supabase/
  schema.sql                        Tables, views, RLS, RPC, storage
  seed.sql                          12 teams + Day 1/2 events
fixtures/event-5-results.json       Dev fixture (no Claude needed)
docs/                               This documentation set
proxy.ts                            Protect /admin, bounce logged-in users off /login
```

---

## 5. Data model

### 5.1 Tables

**`teams`** — one row per university (`code` unique, e.g. `COL`).

**`events`** — championship programme. Unique on `(day, event_number, gender)`. Status:

| Status | Meaning |
| --- | --- |
| `not_uploaded` | No PDF yet (public: Upcoming) |
| `pending_review` | Extracted, not published (public still Upcoming) |
| `confirmed` | Points are live (public: Results Posted) |

**`event_results`** — rows written **only on publish**. Each row is a swimmer/relay team line: position, name, `team_id`, time or code, `result_status`, `points_awarded`.

**`uploads`** — audit trail. Stores Storage path, Claude’s raw JSON (`raw_extraction`), who uploaded, whether that upload was confirmed.

Points are **not** a database table. They are a constant in `lib/points.ts`.

### 5.2 Views

- `team_standings` — points per team per gender (Men / Women)
- `team_overall_standings` — Men + Women summed per team

The public leaderboard **does not depend on these views for ranking**. The client loads `event_results` and ranks in `lib/standings.ts` so count-back (more 1sts, then 2nds, …) can run in one place. The views remain available for SQL / dashboards.

### 5.3 Publish RPC

`publish_event_results(p_event_id, p_replace, p_upload_id, p_rows)`:

1. Locks the event row.
2. If status is `confirmed` and `p_replace` is false → error `already_confirmed`.
3. **Deletes** all `event_results` for that event (never stacks).
4. Inserts the new rows.
5. Sets `events.status = 'confirmed'`.
6. Marks the upload `confirmed = true`.

That is the only write path that changes the scoreboard.

---

## 6. Request flow (who talks to whom)

### Public page load

1. Server Component calls `createClient()` (anon key + cookies).
2. Reads `teams`, `events`, `event_results` under RLS (public `SELECT` is allowed).
3. Leaderboard hydrates a client component that **subscribes** to Postgres changes.

### Official page load

1. `proxy.ts` runs on `/admin/*` and `/login`. No session → redirect to `/login?next=…`. Session on `/login` → redirect to `/admin`.
2. `app/admin/layout.tsx` checks `getUser()` again (defense in depth).
3. API routes call `requireUser()`; unauthenticated requests get `401`.

### Keys

| Key | Where it lives | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | All Supabase calls |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | RLS-scoped access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (`lib/supabase/admin.ts`) | Reserved; current extract/confirm use the **user session** |
| `ANTHROPIC_API_KEY` | Server only | PDF extraction |
| `ANTHROPIC_MODEL` | Server only | Defaults to `claude-sonnet-4-5-20250929` |

Never put the service role or Anthropic key in client components.

---

## 7. Security (RLS)

Enabled on all four tables.

- **anon + authenticated:** `SELECT` on `teams`, `events`, `event_results`. Results only exist after publish, so the public scoreboard cannot leak a draft.
- **authenticated:** insert/update/delete on `events`, `event_results`, `uploads`.
- **uploads:** no public read; audit page is admin-only.
- **Storage `result-pdfs`:** public read (audit PDF links), authenticated upload.

`publish_event_results` is `SECURITY DEFINER` and executable by `authenticated` and `service_role`.

---

## 8. Realtime

1. Schema adds `events` and `event_results` to publication `supabase_realtime`.
2. `LeaderboardBoard` opens a channel `live-standings` and listens for `*` on both tables.
3. On any change it **refetches** teams, events, and results, then re-ranks.

Spectators do not poll. They do not click refresh. The “Last updated Xs ago” clock is local, based on the last successful fetch.

---

## 9. Scoring engine (application layer)

`pointsFor(eventType, position, resultStatus)` in `lib/points.ts`:

- Score only if `result_status === "finished"` **and** position is 1–6.
- Individual: 7, 5, 4, 3, 2, 1.
- Relay: 10, 7, 5, 3, 2, 1 (both genders).
- DNS, DQ, DNF, NS, WD → 0. Place is **not** shifted; later swimmers keep their printed places.

`toPublishRows` maps team **codes** to `team_id` and refuses unknown codes.

`rankStandings` sorts by points, then count-back of 1st–6th place finishes, then team code. Teams with zero points still appear.

Tests: `npm test` (`lib/*.test.ts`).

---

## 10. Hosting topology

```
GitHub  --push-->  Vercel  -->  Next.js (Node)
                      │
                      ├── env: Supabase URL/keys, Anthropic key
                      └── browser  -->  Supabase (anon) + Realtime
```

Local: `npm run dev` (or `npx next start` after build). On some Windows setups the production build uses Webpack (`next build --webpack`) because native SWC can be locked; Vercel Linux uses the default compiler.

---

## 11. What is intentionally not in the architecture

- No per-swimmer career database. Names are stored on the result row only.
- No heat sheets, lane assignments, or timing-system integration.
- No multi-meet / season mode. One championship, two days, seeded in SQL.
- No role matrix beyond “logged in = official”. One shared login is enough for a one-meet operation.
