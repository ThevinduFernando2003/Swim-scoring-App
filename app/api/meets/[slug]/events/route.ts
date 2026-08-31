import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  action: z.enum(["create", "update", "delete"]),
  id: z.number().optional(),
  day: z.number().int().positive().optional(),
  event_number: z.number().int().positive().optional(),
  name: z.string().optional(),
  gender: z.enum(["Men", "Women", "Boys", "Girls", "Mixed"]).optional(),
  event_type: z.enum(["individual", "relay"]).optional(),
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

    if (body.action === "create") {
      const { error } = await supabase.from("events").insert({
        meet_id: meet.id,
        day: body.day ?? 1,
        event_number: body.event_number ?? 1,
        name: (body.name ?? "").trim(),
        gender: body.gender ?? "Men",
        event_type: body.event_type ?? "individual",
        status: "not_uploaded",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (body.action === "update") {
      if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const { data: current } = await supabase
        .from("events")
        .select("status, gender, event_type")
        .eq("id", body.id)
        .eq("meet_id", meet.id)
        .single();
      if (!current) return NextResponse.json({ error: "Event not found" }, { status: 404 });

      const patch: Record<string, unknown> = {
        day: body.day,
        event_number: body.event_number,
        name: body.name?.trim(),
      };
      if (current.status === "confirmed") {
        if (body.gender && body.gender !== current.gender) {
          return NextResponse.json(
            { error: "Gender is locked after results are confirmed" },
            { status: 400 },
          );
        }
        if (body.event_type && body.event_type !== current.event_type) {
          return NextResponse.json(
            { error: "Event type is locked after results are confirmed" },
            { status: 400 },
          );
        }
      } else {
        if (body.gender) patch.gender = body.gender;
        if (body.event_type) patch.event_type = body.event_type;
      }

      const { error } = await supabase
        .from("events")
        .update(patch)
        .eq("id", body.id)
        .eq("meet_id", meet.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (body.action === "delete") {
      if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const { data: current } = await supabase
        .from("events")
        .select("status")
        .eq("id", body.id)
        .eq("meet_id", meet.id)
        .single();
      if (current?.status === "confirmed") {
        return NextResponse.json(
          { error: "Cannot delete an event with confirmed results" },
          { status: 400 },
        );
      }
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", body.id)
        .eq("meet_id", meet.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
