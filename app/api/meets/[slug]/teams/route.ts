import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  action: z.enum(["create", "update", "delete"]),
  id: z.number().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
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
      const code = (body.code ?? "").trim().toUpperCase();
      const name = (body.name ?? "").trim();
      if (!code || !name) {
        return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
      }
      const { error } = await supabase.from("teams").insert({
        meet_id: meet.id,
        code,
        name,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (body.action === "update") {
      if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const { error } = await supabase
        .from("teams")
        .update({
          code: (body.code ?? "").trim().toUpperCase(),
          name: (body.name ?? "").trim(),
        })
        .eq("id", body.id)
        .eq("meet_id", meet.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (body.action === "delete") {
      if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const { error } = await supabase
        .from("teams")
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
