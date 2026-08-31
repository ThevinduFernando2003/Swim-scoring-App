import { notFound, redirect } from "next/navigation";
import { MeetSettingsForm } from "@/components/meet-settings-form";
import { loadMeetBySlug } from "@/lib/data";
import { getAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MeetSettingsPage({
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
  if (!access.canManage) redirect(`/meets/${slug}/admin`);

  const { data: events } = await supabase
    .from("events")
    .select("id, status")
    .eq("meet_id", meet.id)
    .eq("status", "confirmed")
    .limit(1);

  return (
    <MeetSettingsForm
      meet={meet}
      hasConfirmedResults={(events ?? []).length > 0}
    />
  );
}
