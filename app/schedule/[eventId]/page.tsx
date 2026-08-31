import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LegacyEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { eventId } = await params;
  const id = Number(eventId);
  if (!Number.isFinite(id)) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, meet_id, meets(slug)")
    .eq("id", id)
    .maybeSingle();
  const meet = Array.isArray(event?.meets) ? event?.meets[0] : event?.meets;
  if (!meet?.slug) notFound();
  redirect(`/meets/${meet.slug}/events/${id}`);
}
