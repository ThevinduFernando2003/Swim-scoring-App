import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug, loadTeams } from "@/lib/data";
import { foldSwimmerName } from "@/lib/swimmers";
import { createClient } from "@/lib/supabase/server";

const applySchema = z.object({
  action: z.literal("bulk_upsert"),
  swimmers: z.array(
    z.object({
      name: z.string(),
      team_code: z.string(),
      gender: z.string().nullable().optional(),
      age: z.number().nullable().optional(),
      age_group: z.string().nullable().optional(),
      slasu_number: z.string().nullable().optional(),
    }),
  ),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  registered: z.boolean().optional(),
  slasu_verified: z.boolean().optional(),
  present: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  slasu_number: z.string().nullable().optional(),
  age_group: z.string().nullable().optional(),
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

    const body = applySchema.parse(await request.json());
    const teams = await loadTeams(supabase, meet.id);
    const teamByCode = new Map(teams.map((team) => [team.code.toUpperCase(), team]));
    const { data: existing } = await supabase
      .from("swimmers")
      .select("id, team_id, name")
      .eq("meet_id", meet.id);
    const byKey = new Map(
      (existing ?? []).map((row) => [`${row.team_id}:${foldSwimmerName(row.name)}`, row.id]),
    );

    let created = 0;
    let updated = 0;
    const unknownCodes = new Set<string>();

    for (const row of body.swimmers) {
      const team = teamByCode.get(row.team_code.trim().toUpperCase());
      if (!team) {
        unknownCodes.add(row.team_code.trim().toUpperCase() || "(blank)");
        continue;
      }
      const key = `${team.id}:${foldSwimmerName(row.name)}`;
      const payload = {
        name: row.name.trim(),
        gender: row.gender ?? null,
        age: row.age ?? null,
        age_group: row.age_group ?? null,
        slasu_number: row.slasu_number ?? null,
      };
      const id = byKey.get(key);
      if (id) {
        const { error } = await supabase.from("swimmers").update(payload).eq("id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        updated += 1;
      } else {
        const { data, error } = await supabase
          .from("swimmers")
          .insert({
            meet_id: meet.id,
            team_id: team.id,
            ...payload,
          })
          .select("id")
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (data) byKey.set(key, data.id);
        created += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
      unknownCodes: [...unknownCodes],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

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
    if (!access.canScore) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = patchSchema.parse(await request.json());
    const patch: Record<string, unknown> = {};
    if (body.registered != null) patch.registered = body.registered;
    if (body.slasu_verified != null) patch.slasu_verified = body.slasu_verified;
    if (body.present != null) patch.present = body.present;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.age !== undefined) patch.age = body.age;
    if (body.slasu_number !== undefined) patch.slasu_number = body.slasu_number;
    if (body.age_group !== undefined) patch.age_group = body.age_group;

    const { error } = await supabase
      .from("swimmers")
      .update(patch)
      .eq("id", body.id)
      .eq("meet_id", meet.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
