import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadTeams } from "@/lib/data";
import { parsePointsConfig } from "@/lib/points";
import { toPublishRows } from "@/lib/publish";
import { attachSwimmers } from "@/lib/swimmers";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";

const bodySchema = z.object({
  replace: z.boolean().optional().default(false),
  uploadId: z.number().nullable().optional(),
  results: z.array(
    z.object({
      position: z.number().int().nullable(),
      swimmer_name: z.string(),
      team_code: z.string(),
      achievement: z.string(),
      result_status: z.enum(["finished", "DNS", "DQ", "DNF", "NS", "WD"]),
    }),
  ),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const json = await request.json();
    const body = bodySchema.parse(json);

    const supabase = await createClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { access } = await requireMeetAccess(event.meet_id);
    if (!access.canScore) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: meet } = await supabase
      .from("meets")
      .select("status, points_config")
      .eq("id", event.meet_id)
      .single();
    if (meet?.status === "completed" && !access.isSuperAdmin) {
      return NextResponse.json(
        { error: "This meet is completed and read-only" },
        { status: 403 },
      );
    }

    const teams = await loadTeams(supabase, event.meet_id);
    const config = parsePointsConfig(meet?.points_config);
    const { rows, unknownCodes } = toPublishRows(
      event.event_type as EventType,
      body.results,
      teams,
      config,
      event.scores_points !== false && event.round !== "prelim",
    );
    if (unknownCodes.length > 0) {
      return NextResponse.json(
        { error: "Unknown team codes", unknownCodes },
        { status: 400 },
      );
    }

    const withSwimmers = await attachSwimmers(
      supabase,
      event.meet_id,
      rows,
      event.gender ?? null,
    );

    const { error } = await supabase.rpc("publish_event_results", {
      p_event_id: id,
      p_replace: body.replace,
      p_upload_id: body.uploadId ?? null,
      p_rows: withSwimmers,
    });

    if (error) {
      if (error.message.includes("already_confirmed")) {
        return NextResponse.json(
          {
            error:
              "This event already has a confirmed result. Re-publish with replace enabled.",
          },
          { status: 409 },
        );
      }
      if (error.message.includes("forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rows: withSwimmers.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
