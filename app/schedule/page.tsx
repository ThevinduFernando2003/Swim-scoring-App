import { redirect } from "next/navigation";
import { DEFAULT_MEET_SLUG } from "@/lib/constants";
import { loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LegacySchedulePage() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, DEFAULT_MEET_SLUG);
  redirect(meet ? `/meets/${meet.slug}/schedule` : "/");
}
