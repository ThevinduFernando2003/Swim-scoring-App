import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import { parsePointsConfig, pointsFor } from "@/lib/points";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  participant_label: z.string().min(1).optional(),
  status: z.enum(["draft", "live", "completed"]).optional(),
  pdfs_public: z.boolean().optional(),
  points_config: z.unknown().optional(),
  points_mode: z.enum(["future", "recalculate"]).optional(),
  logo_url: z.string().nullable().optional(),
  primary_color: z.string().nullable().optional(),
  background_url: z.string().nullable().optional(),
  next_results_at: z.string().nullable().optional(),
});

export async function PATCH(
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

    const body = patchSchema.parse(await request.json());
    const patch: Record<string, unknown> = {};
    if (body.name) patch.name = body.name.trim();
    if (body.participant_label) patch.participant_label = body.participant_label.trim();
    if (body.status) patch.status = body.status;
    if (body.pdfs_public != null) patch.pdfs_public = body.pdfs_public;
    if (body.logo_url !== undefined) patch.logo_url = body.logo_url || null;
    if (body.primary_color !== undefined) patch.primary_color = body.primary_color || null;
    if (body.background_url !== undefined) patch.background_url = body.background_url || null;
    if (body.next_results_at !== undefined) {
      patch.next_results_at = body.next_results_at
        ? new Date(body.next_results_at).toISOString()
        : null;
    }

    const nextConfig = body.points_config
      ? parsePointsConfig(body.points_config)
      : null;
    if (nextConfig) patch.points_config = nextConfig;

    const { error } = await supabase.from("meets").update(patch).eq("id", meet.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (nextConfig && body.points_mode === "recalculate") {
      const { data: events } = await supabase
        .from("events")
        .select("id, event_type")
        .eq("meet_id", meet.id);
      const eventType = new Map(
        (events ?? []).map((event) => [event.id, event.event_type]),
      );
      const { data: rows } = await supabase
        .from("event_results")
        .select("id, event_id, position, result_status")
        .in(
          "event_id",
          (events ?? []).map((event) => event.id),
        );
      for (const row of rows ?? []) {
        const type = eventType.get(row.event_id);
        if (type !== "individual" && type !== "relay") continue;
        const points = pointsFor(
          type,
          row.position,
          row.result_status,
          nextConfig,
        );
        await supabase
          .from("event_results")
          .update({ points_awarded: points })
          .eq("id", row.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
