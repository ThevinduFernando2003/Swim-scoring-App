import { NextResponse } from "next/server";
import { requireMeetAccess } from "@/lib/auth";
import { loadTeams } from "@/lib/data";
import { finalNameFromPrelim, qualifyFromResults } from "@/lib/qualify";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { access } = await requireMeetAccess(event.meet_id);
    if (!access.canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (event.round !== "prelim") {
      return NextResponse.json({ error: "Only prelims can seed a final" }, { status: 400 });
    }
    if (event.status !== "confirmed") {
      return NextResponse.json({ error: "Confirm prelims before building the final" }, { status: 400 });
    }

    const teams = await loadTeams(supabase, event.meet_id);
    const { data: results } = await supabase
      .from("event_results")
      .select("swimmer_name, team_id, achievement, result_status")
      .eq("event_id", id);
    const qualified = qualifyFromResults(
      results ?? [],
      teams,
      event.qualify_count ?? 8,
    ).filter((row) => row.band === "qualified");
    if (qualified.length === 0) {
      return NextResponse.json({ error: "No legal finishers to qualify" }, { status: 400 });
    }

    let finalId = event.linked_event_id as number | null;
    if (finalId) {
      const { data: existing } = await supabase
        .from("events")
        .select("id, status")
        .eq("id", finalId)
        .maybeSingle();
      if (!existing) finalId = null;
    }

    if (!finalId) {
      const { data: created, error } = await supabase
        .from("events")
        .insert({
          meet_id: event.meet_id,
          day: event.day,
          event_number: event.event_number,
          name: finalNameFromPrelim(event.name),
          gender: event.gender,
          event_type: event.event_type,
          status: "not_uploaded",
          round: "final",
          session: "evening",
          qualify_count: event.qualify_count ?? 8,
          scores_points: true,
          linked_event_id: id,
        })
        .select("id")
        .single();
      if (error || !created) {
        return NextResponse.json({ error: error?.message || "Could not create final" }, { status: 400 });
      }
      finalId = created.id;
      await supabase.from("events").update({ linked_event_id: finalId }).eq("id", id);
    }

    return NextResponse.json({
      ok: true,
      finalId,
      qualified: qualified.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Qualify failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
