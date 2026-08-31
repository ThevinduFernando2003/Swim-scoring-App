import { notFound } from "next/navigation";
import { AdminEventList } from "@/components/admin-event-list";
import { ExportMeetButton } from "@/components/export-meet-button";
import { loadEvents, loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MeetAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();
  const events = await loadEvents(supabase, meet.id);
  return (
    <div className="space-y-6">
      <AdminEventList meet={meet} events={events} />
      <ExportMeetButton slug={meet.slug} />
    </div>
  );
}
