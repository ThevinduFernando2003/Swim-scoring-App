import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventResult, MeetEvent, Team } from "./types";

export async function loadTeams(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("teams")
    .select("id, code, name")
    .order("code");
  if (error) throw error;
  return (data ?? []) as Team[];
}

export async function loadEvents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("events")
    .select("id, day, event_number, name, gender, event_type, status")
    .order("day")
    .order("event_number");
  if (error) throw error;
  return (data ?? []) as MeetEvent[];
}

export async function loadResults(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("event_results")
    .select(
      "id, event_id, position, swimmer_name, team_id, achievement, result_status, points_awarded",
    );
  if (error) throw error;
  return (data ?? []) as EventResult[];
}

export async function loadMeetData(supabase: SupabaseClient) {
  const [teams, events, results] = await Promise.all([
    loadTeams(supabase),
    loadEvents(supabase),
    loadResults(supabase),
  ]);
  return { teams, events, results };
}
