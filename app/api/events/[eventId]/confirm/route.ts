import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { loadTeams } from "@/lib/data";
import { toPublishRows } from "@/lib/publish";
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
    await requireUser();
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

    const teams = await loadTeams(supabase);
    const { rows, unknownCodes } = toPublishRows(
      event.event_type as EventType,
      body.results,
      teams,
    );
    if (unknownCodes.length > 0) {
      return NextResponse.json(
        { error: "Unknown team codes", unknownCodes },
        { status: 400 },
      );
    }

    const { error } = await supabase.rpc("publish_event_results", {
      p_event_id: id,
      p_replace: body.replace,
      p_upload_id: body.uploadId ?? null,
      p_rows: rows,
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rows: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
