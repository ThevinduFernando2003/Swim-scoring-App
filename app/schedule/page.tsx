import { ScheduleList } from "@/components/schedule-list";
import { loadEvents } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  if (!isSupabaseConfigured()) {
    return (
      <p className="text-cream/80">
        Connect Supabase to load the championship schedule.
      </p>
    );
  }

  const supabase = await createClient();
  const events = await loadEvents(supabase);
  return <ScheduleList events={events} />;
}
