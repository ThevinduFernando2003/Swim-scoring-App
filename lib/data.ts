import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePointsConfig } from "./points";
import type {
  Championship,
  EventResult,
  Meet,
  MeetEvent,
  MeetRecord,
  MeetSponsor,
  OrgSettings,
  Swimmer,
  Team,
} from "./types";

export const DEFAULT_ORG: OrgSettings = {
  id: 1,
  name: "Swim Scoring",
  logo_url: null,
  primary_color: "#d4af37",
  footer_text: "Live swimming championship scoring",
};

const MEET_COLUMNS =
  "id, slug, name, participant_label, status, points_config, pdfs_public, created_at, logo_url, primary_color, background_url, next_results_at, championship_id, year";

function asMeet(row: Record<string, unknown>): Meet {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    participant_label: String(row.participant_label ?? "Team"),
    status: (row.status as Meet["status"]) ?? "draft",
    points_config: parsePointsConfig(row.points_config),
    pdfs_public: row.pdfs_public !== false,
    logo_url: row.logo_url ? String(row.logo_url) : null,
    primary_color: row.primary_color ? String(row.primary_color) : null,
    background_url: row.background_url ? String(row.background_url) : null,
    next_results_at: row.next_results_at ? String(row.next_results_at) : null,
    championship_id: row.championship_id ? String(row.championship_id) : null,
    year: row.year != null ? Number(row.year) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error?.message) return false;
  return /does not exist|schema cache|could not find/i.test(error.message);
}

export async function loadOrgSettings(supabase: SupabaseClient): Promise<OrgSettings> {
  const { data, error } = await supabase
    .from("organization_settings")
    .select("id, name, logo_url, primary_color, footer_text")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_ORG;
  return {
    id: 1,
    name: data.name || DEFAULT_ORG.name,
    logo_url: data.logo_url ?? null,
    primary_color: data.primary_color || DEFAULT_ORG.primary_color,
    footer_text: data.footer_text || DEFAULT_ORG.footer_text,
  };
}

export async function loadPublicMeets(supabase: SupabaseClient) {
  let { data, error } = await supabase
    .from("meets")
    .select(MEET_COLUMNS)
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  if (error && isMissingRelation(error)) {
    const fallback = await supabase
      .from("meets")
      .select("id, slug, name, participant_label, status, points_config, pdfs_public, created_at")
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    if (!fallback.error) {
      data = fallback.data as typeof data;
      error = null;
    } else if (!fallback.data && /meets/i.test(fallback.error.message)) {
      return { meets: [] as Meet[], needsMigration: true, error: fallback.error };
    }
  }
  if (error) {
    return { meets: [] as Meet[], needsMigration: isMissingRelation(error), error };
  }
  return {
    meets: (data ?? []).map((row) => asMeet(row as Record<string, unknown>)),
    needsMigration: false,
    error: null,
  };
}

export async function loadMeetBySlug(supabase: SupabaseClient, slug: string) {
  let { data, error } = await supabase
    .from("meets")
    .select(MEET_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error && isMissingRelation(error)) {
    const fallback = await supabase
      .from("meets")
      .select("id, slug, name, participant_label, status, points_config, pdfs_public, created_at")
      .eq("slug", slug)
      .maybeSingle();
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error || !data) return null;
  return asMeet(data as Record<string, unknown>);
}

export async function loadTeams(supabase: SupabaseClient, meetId?: string) {
  let query = supabase.from("teams").select("id, code, name, meet_id").order("code");
  if (meetId) query = query.eq("meet_id", meetId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Team[];
}

export async function loadEvents(supabase: SupabaseClient, meetId?: string) {
  const columns =
    "id, meet_id, day, event_number, name, gender, event_type, status, round, session, linked_event_id, qualify_count, scores_points";
  const fallbackCols = "id, meet_id, day, event_number, name, gender, event_type, status";
  let query = supabase.from("events").select(columns).order("day").order("event_number");
  if (meetId) query = query.eq("meet_id", meetId);
  let { data, error } = await query;
  if (error && isMissingRelation(error)) {
    let fallback = supabase.from("events").select(fallbackCols).order("day").order("event_number");
    if (meetId) fallback = fallback.eq("meet_id", meetId);
    const retry = await fallback;
    data = retry.data as typeof data;
    error = retry.error;
  }
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    round: "round" in row ? row.round : "timed_final",
    session: "session" in row ? row.session : "unspecified",
    linked_event_id: "linked_event_id" in row ? row.linked_event_id : null,
    qualify_count: "qualify_count" in row ? row.qualify_count : 8,
    scores_points: "scores_points" in row ? row.scores_points : true,
  })) as MeetEvent[];
}

export async function loadResults(supabase: SupabaseClient, eventIds?: number[]) {
  const fullCols =
    "id, event_id, position, swimmer_name, team_id, achievement, result_status, points_awarded, swimmer_id, record_flag";
  const fallbackCols =
    "id, event_id, position, swimmer_name, team_id, achievement, result_status, points_awarded, swimmer_id";
  let query = supabase.from("event_results").select(fullCols);
  if (eventIds) {
    if (eventIds.length === 0) return [] as EventResult[];
    query = query.in("event_id", eventIds);
  }
  let { data, error } = await query;
  if (error && isMissingRelation(error)) {
    let fallback = supabase.from("event_results").select(fallbackCols);
    if (eventIds) fallback = fallback.in("event_id", eventIds);
    const retry = await fallback;
    data = retry.data as typeof data;
    error = retry.error;
  }
  if (error) throw error;
  return (data ?? []) as EventResult[];
}

export async function loadSwimmers(supabase: SupabaseClient, meetId: string) {
  const full = await supabase
    .from("swimmers")
    .select(
      "id, meet_id, team_id, name, gender, age_group, age, slasu_number, registered, slasu_verified, present, notes, teams(code, name)",
    )
    .eq("meet_id", meetId)
    .order("name");
  const query =
    full.error && isMissingRelation(full.error)
      ? await supabase
          .from("swimmers")
          .select("id, meet_id, team_id, name, gender, age_group, teams(code, name)")
          .eq("meet_id", meetId)
          .order("name")
      : full;
  if (query.error) throw query.error;
  return (query.data ?? []).map((row) => {
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    return {
      id: row.id,
      meet_id: row.meet_id,
      team_id: row.team_id,
      name: row.name,
      gender: row.gender,
      age_group: row.age_group,
      age: "age" in row ? (row as { age: number | null }).age : null,
      slasu_number: "slasu_number" in row ? (row as { slasu_number: string | null }).slasu_number : null,
      registered: "registered" in row ? Boolean((row as { registered: boolean }).registered) : false,
      slasu_verified: "slasu_verified" in row ? Boolean((row as { slasu_verified: boolean }).slasu_verified) : false,
      present: "present" in row ? Boolean((row as { present: boolean }).present) : false,
      notes: "notes" in row ? (row as { notes: string | null }).notes : null,
      team_code: team?.code,
      team_name: team?.name,
    } as Swimmer;
  });
}

export async function loadMeetRecords(
  supabase: SupabaseClient,
  meetId: string,
  championshipId?: string | null,
) {
  const columns =
    "id, meet_id, event_key, event_name, gender, event_type, time_text, time_ms, swimmer_name, team_code, year, is_current";
  let query = supabase
    .from("meet_records")
    .select(columns)
    .eq("is_current", true)
    .order("event_name");
  query = championshipId
    ? query.eq("championship_id", championshipId)
    : query.eq("meet_id", meetId);
  const { data, error } = await query;
  if (error) {
    if (isMissingRelation(error)) return [] as MeetRecord[];
    throw error;
  }
  if (championshipId && (data ?? []).length === 0) {
    const fallback = await supabase
      .from("meet_records")
      .select(columns)
      .eq("meet_id", meetId)
      .eq("is_current", true)
      .order("event_name");
    if (!fallback.error) return (fallback.data ?? []) as MeetRecord[];
  }
  return (data ?? []) as MeetRecord[];
}

export async function loadChampionships(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("championships")
    .select("id, slug, name, participant_label")
    .order("name");
  if (error) {
    if (isMissingRelation(error)) return [] as Championship[];
    throw error;
  }
  return (data ?? []) as Championship[];
}

export async function loadChampionshipBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("championships")
    .select("id, slug, name, participant_label")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as Championship;
}

export async function loadChampionshipEditions(
  supabase: SupabaseClient,
  championshipId: string,
) {
  const { data, error } = await supabase
    .from("meets")
    .select(MEET_COLUMNS)
    .eq("championship_id", championshipId)
    .neq("status", "draft")
    .order("year", { ascending: false });
  if (error) {
    if (isMissingRelation(error)) return [] as Meet[];
    throw error;
  }
  return (data ?? []).map((row) => asMeet(row as Record<string, unknown>));
}

export async function loadSponsors(supabase: SupabaseClient, meetId: string) {
  const { data, error } = await supabase
    .from("meet_sponsors")
    .select("id, meet_id, name, logo_url, url, placement, sort_order")
    .eq("meet_id", meetId)
    .order("sort_order");
  if (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
  return (data ?? []) as MeetSponsor[];
}

export async function loadMeetData(supabase: SupabaseClient, meetId: string) {
  const [teams, events] = await Promise.all([
    loadTeams(supabase, meetId),
    loadEvents(supabase, meetId),
  ]);
  const results = await loadResults(
    supabase,
    events.map((event) => event.id),
  );
  return { teams, events, results };
}

export async function loadMeetBundle(supabase: SupabaseClient, slug: string) {
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) return null;
  const data = await loadMeetData(supabase, meet.id);
  return { meet, ...data };
}
