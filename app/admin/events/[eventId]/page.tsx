import { notFound } from "next/navigation";
import { EventReview } from "@/components/event-review";
import { loadTeams } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ExtractionPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const id = Number(eventId);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, day, event_number, name, gender, event_type, status")
    .eq("id", id)
    .single();
  if (!event) notFound();

  const teams = await loadTeams(supabase);
  const { data: upload } = await supabase
    .from("uploads")
    .select("id, raw_extraction")
    .eq("event_id", id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <EventReview
      event={event}
      teams={teams}
      initialExtraction={(upload?.raw_extraction as ExtractionPayload) ?? null}
      initialUploadId={upload?.id ?? null}
    />
  );
}
