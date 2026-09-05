import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadTeams } from "@/lib/data";
import { parsePointsConfig } from "@/lib/points";
import { toPublishRows } from "@/lib/publish";
import { applyNmrFlags, eventRecordKey, nextCurrentRecord } from "@/lib/records";
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
      .select("status, points_config, name, championship_id, year")
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

    let publishRows = withSwimmers;
    const recordKey = eventRecordKey(event.name, event.gender, event.event_type);
    const championshipId = meet?.championship_id as string | null | undefined;
    function scopeRecords<T extends { eq: (col: string, val: string) => T }>(query: T) {
      return championshipId
        ? query.eq("championship_id", championshipId)
        : query.eq("meet_id", event.meet_id);
    }
    if (event.round !== "prelim") {
      if (body.replace) {
        await supabase.from("meet_records").delete().eq("set_at_event_id", id);
        const leftoverQuery = scopeRecords(
          supabase.from("meet_records").select("id").eq("event_key", recordKey),
        );
        const { data: leftover } = await leftoverQuery
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (leftover) {
          await scopeRecords(
            supabase.from("meet_records").update({ is_current: false }).eq("event_key", recordKey),
          );
          await supabase.from("meet_records").update({ is_current: true }).eq("id", leftover.id);
        }
      }

      const { data: currentRecord } = await scopeRecords(
        supabase
          .from("meet_records")
          .select(
            "event_key, event_name, gender, event_type, time_text, time_ms, swimmer_name, team_code, year",
          )
          .eq("event_key", recordKey)
          .eq("is_current", true),
      ).maybeSingle();

      const flagged = applyNmrFlags(publishRows, currentRecord);
      publishRows = flagged.rows;
      const year =
        meet?.year ??
        (String(meet?.name ?? "").match(/(19|20)\d{2}/)
          ? Number(String(meet?.name ?? "").match(/(19|20)\d{2}/)?.[0])
          : new Date().getFullYear());
      const next = nextCurrentRecord(
        flagged.brokenBy,
        event,
        new Map(teams.map((team) => [team.id, team.code])),
        year,
      );
      if (next) {
        await scopeRecords(
          supabase
            .from("meet_records")
            .update({ is_current: false })
            .eq("event_key", recordKey)
            .eq("is_current", true),
        );
        await supabase.from("meet_records").insert({
          meet_id: event.meet_id,
          championship_id: championshipId ?? null,
          ...next,
          is_current: true,
          set_at_event_id: id,
        });
      }
    }

    const { error } = await supabase.rpc("publish_event_results", {
      p_event_id: id,
      p_replace: body.replace,
      p_upload_id: body.uploadId ?? null,
      p_rows: publishRows,
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

    return NextResponse.json({ ok: true, rows: publishRows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
