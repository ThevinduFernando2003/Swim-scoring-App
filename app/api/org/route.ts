import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1),
  logo_url: z.string().nullable().optional(),
  primary_color: z.string().min(3),
  footer_text: z.string().min(1),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    if (!(await isSuperAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = schema.parse(await request.json());
    const { error } = await supabase.from("organization_settings").upsert({
      id: 1,
      name: body.name.trim(),
      logo_url: body.logo_url || null,
      primary_color: body.primary_color.trim(),
      footer_text: body.footer_text.trim(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
