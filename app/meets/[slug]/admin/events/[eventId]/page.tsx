import { notFound } from "next/navigation";
import { EventReview } from "@/components/event-review";
import { loadMeetBySlug, loadSwimmers, loadTeams } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ExtractionPayload, MeetEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await params;
  const id = Number(eventId);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, meet_id, day, event_number, name, gender, event_type, status")
    .eq("id", id)
    .eq("meet_id", meet.id)
    .single();
  if (!event) notFound();

  const [teams, swimmers] = await Promise.all([
    loadTeams(supabase, meet.id),
    loadSwimmers(supabase, meet.id),
  ]);
  const { data: upload } = await supabase
    .from("uploads")
    .select("id, raw_extraction")
    .eq("event_id", id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <EventReview
      meet={meet}
      event={event as MeetEvent}
      teams={teams}
      swimmers={swimmers}
      pointsConfig={meet.points_config}
      initialExtraction={(upload?.raw_extraction as ExtractionPayload) ?? null}
      initialUploadId={upload?.id ?? null}
    />
  );
}
