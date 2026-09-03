import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  action: z.enum(["create", "update", "delete"]),
  id: z.string().uuid().optional(),
  name: z.string().optional(),
  logo_url: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  placement: z.enum(["footer", "background", "header"]).optional(),
  sort_order: z.number().int().optional(),
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
      const name = (body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      const { error } = await supabase.from("meet_sponsors").insert({
        meet_id: meet.id,
        name,
        logo_url: body.logo_url || null,
        url: body.url || null,
        placement: body.placement ?? "footer",
        sort_order: body.sort_order ?? 0,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (body.action === "update" && body.id) {
      const { error } = await supabase
        .from("meet_sponsors")
        .update({
          name: body.name?.trim(),
          logo_url: body.logo_url,
          url: body.url,
          placement: body.placement,
          sort_order: body.sort_order,
        })
        .eq("id", body.id)
        .eq("meet_id", meet.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (body.action === "delete" && body.id) {
      const { error } = await supabase
        .from("meet_sponsors")
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
