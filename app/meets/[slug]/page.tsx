import { notFound } from "next/navigation";
import { LeaderboardBoard } from "@/components/leaderboard-board";
import { loadMeetBundle, loadSwimmers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MeetLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const bundle = await loadMeetBundle(supabase, slug);
  if (!bundle) notFound();
  const swimmers = await loadSwimmers(supabase, bundle.meet.id);

  return (
    <LeaderboardBoard
      meet={bundle.meet}
      initialTeams={bundle.teams}
      initialEvents={bundle.events}
      initialResults={bundle.results}
      initialSwimmers={swimmers}
    />
  );
}
