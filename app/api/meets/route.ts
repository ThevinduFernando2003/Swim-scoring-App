import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/constants";
import { DEFAULT_POINTS_CONFIG } from "@/lib/points";
import { isSuperAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  participant_label: z.string().min(1).default("Team"),
  clone_from: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    if (!(await isSuperAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = bodySchema.parse(await request.json());
    const slug = slugify(body.slug);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    let points = DEFAULT_POINTS_CONFIG;
    let sourceMeetId: string | null = null;
    if (body.clone_from) {
      const { data: source } = await supabase
        .from("meets")
        .select("id, points_config")
        .eq("slug", body.clone_from)
        .maybeSingle();
      if (!source) {
        return NextResponse.json({ error: "Clone source not found" }, { status: 404 });
      }
      points = source.points_config ?? points;
      sourceMeetId = source.id;
    }

    const { data: meet, error } = await supabase
      .from("meets")
      .insert({
        name: body.name.trim(),
        slug,
        participant_label: body.participant_label.trim(),
        status: "draft",
        points_config: points,
        created_by: user.id,
      })
      .select("id, slug")
      .single();
    if (error || !meet) {
      return NextResponse.json(
        { error: error?.message || "Could not create meet" },
        { status: 400 },
      );
    }

    await supabase.from("meet_roles").insert({
      meet_id: meet.id,
      user_id: user.id,
      role: "meet_admin",
    });

    if (sourceMeetId) {
      const { data: events } = await supabase
        .from("events")
        .select("day, event_number, name, gender, event_type, round, session, qualify_count, scores_points")
        .eq("meet_id", sourceMeetId);
      if (events?.length) {
        await supabase.from("events").insert(
          events.map((event) => ({
            ...event,
            meet_id: meet.id,
            status: "not_uploaded",
          })),
        );
      }
    }

    return NextResponse.json({ slug: meet.slug, id: meet.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
