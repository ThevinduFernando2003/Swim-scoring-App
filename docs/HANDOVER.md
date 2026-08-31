# Handover checklist

Transfer (or add as owner) every account the live site depends on **before** a championship week. Do not leave billing on a personal card.

## Accounts to transfer

- [ ] **GitHub** repository: add the federation’s technical contact as admin, or transfer the repo to their org. Keep `main` as the default branch.
- [ ] **Vercel** project: transfer to their Vercel team, or invite them as owner. Confirm Production env vars still exist after transfer.
- [ ] **Supabase** project: invite them as owner. Confirm Auth users, Storage bucket `result-pdfs`, and that **daily backups** are enabled (Project Settings → Database → Backups).
- [ ] **OpenAI and/or Anthropic** billing: new API keys issued on their account; old personal keys rotated and removed from Vercel.
- [ ] Custom domain (optional): in Vercel → **Domains**, add `results.example.org`. At the DNS host, add the records Vercel shows (usually an A or CNAME). No app code change is required.

## Environment variables (Vercel + `.env.local`)

Must **not** be in git. After transfer, set:

| Name | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (invites, signed PDFs) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | PDF extraction |

## Database upgrade for this version

On an existing live project, run **`supabase/migration_v2.sql` once** in the SQL editor. It wraps current Inter Uni data as meet `inter-uni-2026`. Do not re-run `schema.sql` on a database that already has results.

## Branding

Super Admin → **Admin → Branding**: organisation name, logo URL, primary colour, footer text.

## Monitoring

Turn on Vercel’s deployment / error emails for the project (Project → **Settings** → notifications), or point an uptime ping (Better Stack, UptimeRobot, etc.) at the production URL with an email/Slack alert.

## Secrets in git

`npm run check-secrets` (also runs in CI) fails the build if a likely API key is committed. `.env.local` stays gitignored.
