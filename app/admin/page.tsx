import { AdminEventList } from "@/components/admin-event-list";
import { loadEvents } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const events = await loadEvents(supabase);
  return <AdminEventList events={events} />;
}
