import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LegacyAdminEventPage({
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
    .select("id, meets(slug)")
    .eq("id", id)
    .maybeSingle();
  const meet = Array.isArray(event?.meets) ? event?.meets[0] : event?.meets;
  if (!meet?.slug) redirect("/admin");
  redirect(`/meets/${meet.slug}/admin/events/${id}`);
}
