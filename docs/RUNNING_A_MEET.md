# Running a meet

This guide is for a federation official. You do not need to know how to code.

The in-app copy lives at **Admin → Running a meet** (`/admin/guide`).

## 1. Create the meet

A Super Admin opens **Admin → New meet**. Enter:

- Championship name
- Short URL name (slug), for example `sl-schools-2026`
- Whether participants are Universities, Schools, or Clubs

You can start with an empty programme or copy another meet’s event list and points table. Set the **year** and attach it to a championship series (for example Inter University) so next year’s edition can reuse records and people can open past results. New meets start as **draft** (the public cannot see them).

## 2. Set up teams, schedule, and points

Open that meet’s admin area:

1. Add every team/school with a short code (`COL`, `SJP`, …), or drop the official list PDF.
2. Build the programme by hand or import the schedule PDF. Mark morning **prelims** and evening **finals** when the meet uses heats. After prelims are published, use **Build evening final from top 8**. Set **Next results expected at** so the public knows when to check back.
3. Import the entry roster PDF, then use **Roster / check-in** on day one (registered, SLASU, present).
4. Under **Records**, enter last year’s best times. A faster published swim is marked NMR.
5. Under **Appearance**, set this meet’s colour, official logo, and sponsors.
6. Open **Settings**. Choose how many places score and the points for each place.
7. Switch status to **live** when the public should see the meet.

If you change points after results are already published, the app will ask whether to keep old points or recalculate everything. It will not silently rewrite scores.

## 3. Invite officials

On **Officials**, enter their email. They sign in from the **Officials** link on the site.

- **Officials** can upload PDFs and publish results for this meet only.
- **Meet admins** can also edit teams, the schedule, and the points table.
- They cannot change another meet.

## 4. Upload and confirm a result

**Uploads → pick the event → drop the official PDF.** Check every row (names, team codes, times, DNS/DQ). Equal times are a tie: they share the place (1=, 1=) and the next place is skipped. Both score that place’s points. Yellow notes mean similar names on the same team — fix the spelling to attach to the same swimmer, or leave them if they are different people.

Then **Confirm & Publish**. The leaderboard updates immediately. Anyone can open **View original PDF** on the public event page.

## 5. Correct a mistake

Open the event again, tick **Replace existing result**, edit the table, and publish. Points for that event are rebuilt from scratch — they never stack on top of the old ones.

## 6. Close the meet

Download standings CSV from the public leaderboard if you need a gazette copy. Meet admins can also **Export full meet (JSON)** for backup.

From **Settings**, set status to **completed**. The meet stays visible as an archive. Uploads stop until a meet admin sets it back to live.
