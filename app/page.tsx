import { LeaderboardBoard } from "@/components/leaderboard-board";
import { loadMeetData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { teams, events, results } = await loadMeetData(supabase);

  return (
    <LeaderboardBoard
      initialTeams={teams}
      initialEvents={events}
      initialResults={results}
    />
  );
}

function SetupNotice() {
  return (
    <div className="rounded-xl border border-gold/30 bg-navy-mid p-8">
      <h1 className="text-3xl font-black text-cream">Leaderboard</h1>
      <p className="mt-3 max-w-xl text-cream/80">
        Connect Supabase to load live standings. Copy{" "}
        <code className="text-gold">.env.example</code> to{" "}
        <code className="text-gold">.env.local</code>, run{" "}
        <code className="text-gold">supabase/schema.sql</code> and{" "}
        <code className="text-gold">supabase/seed.sql</code>, then restart the
        app.
      </p>
    </div>
  );
}
