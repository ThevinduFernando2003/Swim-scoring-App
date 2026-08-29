# Features and processes

Product behaviour for spectators and meet officials: screens, scoring rules, edge cases, and operational processes.

See also: [Architecture](./ARCHITECTURE.md) · [PDF pipeline](./PDF-PIPELINE.md) · [Next steps](./NEXT-STEPS.md)

---

## 1. Roles

| Role | Login | Can do |
| --- | --- | --- |
| Spectator | No | View leaderboard, schedule, posted results |
| Meet official / scorer | Yes (email + password) | Upload PDFs, edit extraction, publish, replace, open audit PDFs |

There is no finer role model (no “referee vs scorer”). Anyone who can sign in is an official. Create 1–3 accounts in the Supabase dashboard for people at the scoring table.

---

## 2. Public features

### 2.1 Leaderboard (`/`)

- Three tabs: **Overall | Men | Women**.
- Overall = that university’s Men points + Women points. A uni that only swims one gender still appears (partial total, not hidden).
- All 12 seeded teams appear even at 0 points.
- Rank uses **points**, then **count-back** (more 1st places, then 2nds, … 6ths), then team code.
- Mobile: stacked cards. Desktop: table. Large numerals, gold on navy, 3-letter badges.
- Live pulse + “Last updated Xs ago” — no refresh button required.
- If Supabase env vars are missing, a setup notice is shown instead of a crash.

### 2.2 Schedule (`/schedule`)

- Day 1 (1 August 2026) and Day 2 tabs.
- Each event: number, name, gender, type (individual / relay).
- Public pills: **Upcoming** or **Results Posted**. Drafts (`pending_review`) look like Upcoming so spectators never see a half-checked sheet.
- Tapping a confirmed event opens `/schedule/[eventId]`.

### 2.3 Event result detail

- Top 6 **finished** rows only.
- Medal glyphs for 1st–3rd.
- Name, team badge + full name, time, points awarded to the **team**.

---

## 3. Official features

### 3.1 Sign in (`/login`)

- Email / password via Supabase Auth.
- After success, redirect to `/admin` or to `?next=` if they were sent from a protected URL (`next` must start with `/` to avoid open redirects).
- **Officials** link in the header when logged out; **Admin** when logged in.

### 3.2 Dashboard (`/admin`)

- All events in programme order, grouped by day.
- Filters: All / Not uploaded / Pending review / Confirmed.
- Actions: Upload result, Review, or Correct / replace.
- Links: Audit log, Sign out.

### 3.3 Upload and review (`/admin/events/[id]`)

- Drag-and-drop or file picker for PDF.
- Loading state while Claude extracts.
- Editable table (see [PDF pipeline](./PDF-PIPELINE.md)).
- Development: **Load Event 5 fixture**.
- **Confirm & Publish** — first time.
- **Replace & Publish** — only after ticking replace on a live event.

### 3.4 Audit log (`/admin/audit`)

- Every extract: timestamp, event, uploader, draft vs confirmed.
- **Original PDF** link when the file is a real Storage object (not the fixture path).

---

## 4. Scoring rules (meet law as implemented)

1. Only positions **1–6** with status **finished** score.
2. Points go to the **university**, keyed by team code.
3. Relays use the higher table for both genders.
4. DNS / DQ / DNF / NS / WD → 0, even if listed as place 1.
5. No automatic promotion when someone is DQ’d.
6. One confirmed result set per event. A second publish must be an explicit **replace** (delete that event’s rows, insert the new set).
7. Ties on a tab: more 1sts, then 2nds, … then 6ths (`TIEBREAK = "countback"` in `lib/standings.ts`). Change that constant if the meet uses a different rule.
8. Interval rows in the printed programme are **not** events in the database.

### Points table

| Place | Individual | Relay |
| --- | --- | --- |
| 1 | 7 | 10 |
| 2 | 5 | 7 |
| 3 | 4 | 5 |
| 4 | 3 | 3 |
| 5 | 2 | 2 |
| 6 | 1 | 1 |

---

## 5. Seeded championship data

**Teams:** COL, SAB, KEL, MOR, SJP, UVA, RUH, PER, JAF, WAY, RAJ, VAU (full names in `supabase/seed.sql`).

**Day 1:** events 1–16 (including Women’s and Men’s 4x100m Medley Relay as relays).

**Day 2:** events 1–12 (including 4x100m Freestyle relays).

To add another university later, insert into `teams` and it appears on the leaderboard at 0 until it scores.

---

## 6. Operational processes

### Process A — First result of an event

1. Sign in → dashboard → **Upload result**.
2. Drop the PDF. Wait for the table.
3. Check top 6 names, codes, times. Fix anything Claude misread.
4. Confirm & Publish.
5. Glance at `/` on a phone: that team’s points should move within a second or two.

### Process B — Wrong team code flagged

1. Red dropdown = code not in seed.
2. Pick the correct university from the list (or add the uni in SQL if it is genuinely new, then reload).
3. Confirm stays disabled until every row has a known code.

### Process C — DQ after results were posted

1. Open the event (Correct / replace).
2. Change the athlete’s status to DQ (and achievement if you want the sheet to match).
3. Tick **Replace existing result**.
4. Replace & Publish.
5. That event’s old points vanish; new points apply. Other events unchanged.

### Process D — Re-upload a better PDF

1. Upload again (extract stores a new `uploads` row; live board unchanged).
2. Review.
3. Replace & Publish if the event was already confirmed.

### Process E — Claude unavailable on meet day

1. Add rows by hand (or use the fixture only in development).
2. Fill position, name, team, time, status.
3. Confirm & Publish. Scoring does not need Claude at publish time.

---

## 7. Status mapping (internal vs public)

| DB `events.status` | Admin pill | Spectator pill |
| --- | --- | --- |
| `not_uploaded` | Not Uploaded | Upcoming |
| `pending_review` | Pending Review | Upcoming |
| `confirmed` | Confirmed | Results Posted |

---

## 8. Visual design

- Navy `#0a1628`, gold `#d4af37`, cream text.
- High contrast for outdoor phones.
- Sticky header: Inter-University / Swimming 2026.
- Team badges: monospace 3-letter codes on gold.

---

## 9. Tests covering behaviour

`npm test` runs Node’s test runner on:

- Individual and relay point tables
- Non-finishers and place 7+ = 0
- DQ does not auto-shift
- Unknown team codes blocked
- Replace rebuilds points instead of stacking
- Event 5 fixture JSON parse (including markdown fences)
