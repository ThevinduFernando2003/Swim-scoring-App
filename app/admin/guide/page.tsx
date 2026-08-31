import Link from "next/link";

export default function RunningAMeetGuidePage() {
  return (
    <article className="prose prose-invert max-w-3xl space-y-4 text-cream/90">
      <p>
        <Link href="/admin" className="text-sm font-semibold text-gold no-underline">
          ← Admin
        </Link>
      </p>
      <h1 className="text-3xl font-black text-cream">Running a meet</h1>
      <p>
        This is for a federation official, not a programmer. You only need a
        browser and the login you were given.
      </p>
      <h2 className="text-xl font-bold text-gold">1. Create the meet</h2>
      <p>
        A Super Admin opens Admin → New meet. Enter the championship name, a
        short URL name (slug), and whether participants are Universities,
        Schools, or Clubs. You can start blank or copy another meet’s event
        list and points table. New meets start as <strong>draft</strong> (not
        shown to the public).
      </p>
      <h2 className="text-xl font-bold text-gold">2. Set up teams, schedule, points</h2>
      <p>
        In that meet’s admin area: add every team/school with a short code
        (COL, …). Build the programme (day, event number, name, gender,
        individual or relay). Open Settings and set how many places score and
        the points for each place. Switch status to <strong>live</strong> when
        the public should see it.
      </p>
      <h2 className="text-xl font-bold text-gold">3. Invite officials</h2>
      <p>
        On Officials, enter their email. They must sign in at the Officials
        link. Officials can upload PDFs and publish results; they cannot change
        the points table or the team list.
      </p>
      <h2 className="text-xl font-bold text-gold">4. Upload and confirm a result</h2>
      <p>
        Uploads → pick the event → drop the official PDF. Check every row
        (names, team codes, times, DNS/DQ). Yellow notes mean similar names on
        the same team — fix spelling to attach to the same swimmer, or leave
        them if they are different people. Then Confirm &amp; Publish. The
        leaderboard updates immediately.
      </p>
      <h2 className="text-xl font-bold text-gold">5. Correct a mistake</h2>
      <p>
        Open the event again, tick “Replace existing result”, edit the table,
        and publish. Points are rebuilt for that event only — they never stack
        on top of the old ones.
      </p>
      <h2 className="text-xl font-bold text-gold">6. Close the meet</h2>
      <p>
        Download standings CSV from the public leaderboard if you need a
        gazette copy. From Settings, set status to <strong>completed</strong>.
        The meet stays visible as an archive; uploads stop until a meet admin
        re-opens it.
      </p>
    </article>
  );
}
