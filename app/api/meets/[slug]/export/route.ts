import { NextResponse } from "next/server";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBundle, loadSwimmers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();
    const bundle = await loadMeetBundle(supabase, slug);
    if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { access } = await requireMeetAccess(bundle.meet.id);
    if (!access.canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const swimmers = await loadSwimmers(supabase, bundle.meet.id);
    const payload = {
      exported_at: new Date().toISOString(),
      meet: bundle.meet,
      teams: bundle.teams,
      events: bundle.events,
      results: bundle.results,
      swimmers,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${bundle.meet.slug}-full-export.json"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
