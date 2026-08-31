# If something breaks

One page for whoever is on call during a meet. You do not need the original developer’s laptop.

## 1. Is the website down?

1. Open the production URL (Vercel → project **swim-scoring-app** → **Domains**).
2. If it fails, open [Vercel Dashboard](https://vercel.com/dashboard) → the project → **Deployments**.
   - Latest Production deploy **Ready** → the app code is up; the problem is likely DNS or the browser cache.
   - Latest deploy **Error** → open the failed deployment **Logs**. A missing environment variable is the usual cause.
3. Status page: [https://www.vercel-status.com](https://www.vercel-status.com).

**Who:** hosting account owner (Vercel team).

## 2. Is the database down?

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → the project.
2. **Database** / **Logs** should load. If the project is paused (free tier inactivity), restore it from the dashboard.
3. Status page: [https://status.supabase.com](https://status.supabase.com).

Automatic **daily backups** are a paid-project setting in Supabase (**Project Settings → Database → Backups**). Restore from there if a migration went wrong. Do not restore over a live meet without telling officials first.

**Who:** database account owner (Supabase org).

## 3. PDFs will not extract

1. Confirm `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) is set on Vercel for **Production**.
2. Confirm billing is active on that AI provider so the key is not disabled.
3. Try a second PDF. If only one sheet fails, the scan may be unreadable — enter the table by hand on the review screen.

**Who:** whoever pays for OpenAI / Anthropic.

## 4. Leaderboard did not update

1. Hard-refresh the public page.
2. In meet admin, confirm the event status is **Confirmed**.
3. If it is still wrong, use **Replace existing result** on that event.

**Who:** meet official. App code is only needed if publish returns an error.

## 5. Who owns which layer

| Layer | What it is | Contact |
| --- | --- | --- |
| Hosting | Vercel (the website) | Vercel team owner |
| Database / login / PDF files | Supabase | Supabase org owner |
| PDF reading | OpenAI or Anthropic API | That provider’s billing owner |
| App behaviour / bugs | This GitHub repository | See [SUPPORT.md](SUPPORT.md) |
