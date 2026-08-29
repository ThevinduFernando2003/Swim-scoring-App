# Next steps

The app code is on GitHub. It will not score a live meet until Supabase, Auth, and (for PDFs) Anthropic are connected. Do these in order.

See also: [Architecture](./ARCHITECTURE.md) · [PDF pipeline](./PDF-PIPELINE.md) · [Features](./FEATURES.md)

---

## 1. Create a Supabase project

1. Open [https://supabase.com](https://supabase.com) and create a project (region close to Sri Lanka / your officials, e.g. Singapore or Mumbai if available).
2. Wait until the database is ready.
3. **Project Settings → API**: copy
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose in the browser)

## 2. Run SQL

In **SQL Editor**:

1. Paste and run [`supabase/schema.sql`](../supabase/schema.sql) (tables, views, RLS, `publish_event_results`, storage bucket, realtime publication).
2. Paste and run [`supabase/seed.sql`](../supabase/seed.sql) (12 universities + Day 1/2 events).

Confirm:

- Table Editor shows `teams` (12 rows) and `events` (28 rows).
- Storage shows bucket `result-pdfs`.
- Database → Publications → `supabase_realtime` includes `events` and `event_results`.

If a policy already exists error appears, the `drop policy if exists` statements should make a re-run safe. Seed uses `on conflict` so it is safe to re-run for names/codes; it will **not** reset event status (so you will not wipe a live meet by accident).

## 3. Create official logins

1. Authentication → Providers → **Email** enabled (password).
2. Turn **off** “Confirm email” if you need accounts to work immediately on meet day, or confirm the inboxes yourself.
3. Authentication → Users → **Add user** → email + password for 1–3 officials.
4. Optional: disable public sign-up so only invited users exist.

There is no in-app “register” page on purpose.

## 4. Anthropic key (PDF extraction)

1. Create an API key at [https://console.anthropic.com](https://console.anthropic.com).
2. Set `ANTHROPIC_API_KEY` in `.env.local` and Vercel.
3. Optional: `ANTHROPIC_MODEL=claude-sonnet-4-5-20250929` (or another current Claude model that accepts PDF document blocks).

Until this is set, use **Load Event 5 fixture** in `next dev` to practice publish → leaderboard.

## 5. Local `.env.local`

```bash
cp .env.example .env.local
```

Fill all values. Restart `npm run dev`.

Smoke test:

1. Open http://localhost:3000 — twelve teams at 0, not the setup notice.
2. Sign in at `/login`.
3. Open Day 1 Event 5 → fixture or `Results/DAY 01 - EVENT 05.pdf`.
4. Confirm & Publish → leaderboard COL 7, SAB 5, etc.
5. Open the same URL on your phone on the same Wi-Fi; publish a second event; the phone should move without refresh.

## 6. Deploy on Vercel

1. [https://vercel.com](https://vercel.com) → Add New → Import the GitHub repo `Swim-scoring-App`.
2. Framework: Next.js (auto).
3. Environment variables — same as `.env.example` (Production + Preview if you want preview deploys to work).
4. Deploy. Copy the `*.vercel.app` URL.
5. Optional: add a custom domain.

Every push to `main` rebuilds production.

## 7. Meet-day checklist

- [ ] Seeded teams match the official entry list (add missing unis in SQL).
- [ ] Officials can sign in on the pool Wi-Fi / phone hotspot.
- [ ] One laptop is “source of truth” for uploads; others only watch `/`.
- [ ] Try one real PDF **before** the first final (Event 5 sample is in `Results/`).
- [ ] Agree who is allowed to tick **Replace** (DQ corrections).
- [ ] Keep the Anthropic console open in case of rate limits.

## 8. Optional improvements (after the meet works)

- Confirm official university names if any seed name is wrong; `update teams set name = … where code = …`.
- Disable the development fixture button (already hidden when `NODE_ENV === "production"`).
- Add more teams (Eastern, Open University, etc.) if they enter.
- Change tiebreak in `lib/standings.ts` if the meet uses a different rule.
- Restrict Storage URLs or switch the bucket to private + signed URLs if PDFs should not be world-readable.
- Add a simple PIN or second factor if the shared password leaks.

## 9. What you do **not** need

- A second backend, Redis, or a WebSocket server.
- A CMS for the schedule (it is SQL seed).
- App Store / Play Store — it is a mobile-friendly website.
