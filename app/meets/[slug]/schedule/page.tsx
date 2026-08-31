import { notFound } from "next/navigation";
import { ScheduleList } from "@/components/schedule-list";
import { loadEvents, loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MeetSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();
  const events = await loadEvents(supabase, meet.id);
  return <ScheduleList events={events} slug={meet.slug} />;
}
