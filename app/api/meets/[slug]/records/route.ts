import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import { eventRecordKey } from "@/lib/records";
import { parseSwimTimeMs } from "@/lib/times";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  action: z.enum(["create", "delete"]),
  id: z.string().uuid().optional(),
  event_name: z.string().optional(),
  gender: z.enum(["Men", "Women", "Boys", "Girls", "Mixed"]).optional(),
  event_type: z.enum(["individual", "relay"]).optional(),
  time_text: z.string().optional(),
  swimmer_name: z.string().optional(),
  team_code: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();
    const meet = await loadMeetBySlug(supabase, slug);
    if (!meet) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { access } = await requireMeetAccess(meet.id);
    if (!access.canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = schema.parse(await request.json());
    if (body.action === "delete" && body.id) {
      const { error } = await supabase
        .from("meet_records")
        .delete()
        .eq("id", body.id)
        .eq("meet_id", meet.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    const eventName = (body.event_name ?? "").trim();
    const timeText = (body.time_text ?? "").trim();
    const swimmer = (body.swimmer_name ?? "").trim();
    const gender = body.gender ?? "Men";
    const eventType = body.event_type ?? "individual";
    const timeMs = parseSwimTimeMs(timeText);
    if (!eventName || !swimmer || timeMs == null) {
      return NextResponse.json(
        { error: "Event name, swimmer, and a valid time are required" },
        { status: 400 },
      );
    }

    const key = eventRecordKey(eventName, gender, eventType);
    await supabase
      .from("meet_records")
      .update({ is_current: false })
      .eq("meet_id", meet.id)
      .eq("event_key", key)
      .eq("is_current", true);

    const { error } = await supabase.from("meet_records").insert({
      meet_id: meet.id,
      event_key: key,
      event_name: eventName,
      gender,
      event_type: eventType,
      time_text: timeText,
      time_ms: timeMs,
      swimmer_name: swimmer,
      team_code: body.team_code?.trim() || null,
      year: body.year ?? null,
      is_current: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
