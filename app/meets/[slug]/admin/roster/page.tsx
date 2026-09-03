import { notFound, redirect } from "next/navigation";
import { RosterDesk } from "@/components/roster-desk";
import { loadMeetBySlug, loadSwimmers, loadTeams } from "@/lib/data";
import { getAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();
  const access = await getAccess(supabase, user, meet.id);
  if (!access.canScore) redirect(`/meets/${slug}`);
  const [teams, swimmers] = await Promise.all([
    loadTeams(supabase, meet.id),
    loadSwimmers(supabase, meet.id),
  ]);
  return (
    <RosterDesk
      meet={meet}
      teams={teams}
      swimmers={swimmers}
      canImport={access.canManage}
    />
  );
}
