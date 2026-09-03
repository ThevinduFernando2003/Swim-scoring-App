import { NextResponse } from "next/server";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import {
  extractRosterFromPdf,
  extractScheduleFromPdf,
  extractTeamsFromPdf,
} from "@/lib/import-extract";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = ["teams", "roster", "schedule"] as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const supabase = await createClient();
    const meet = await loadMeetBySlug(supabase, slug);
    if (!meet) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { user, access } = await requireMeetAccess(meet.id);
    if (!access.canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limited = rateLimit(`import:${user.id}`, 8, 10 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many PDF imports. Try again in ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    if (!KINDS.includes(kind as (typeof KINDS)[number])) {
      return NextResponse.json({ error: "Unknown import type" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());

    if (kind === "teams") {
      return NextResponse.json({ teams: await extractTeamsFromPdf(bytes) });
    }
    if (kind === "roster") {
      return NextResponse.json({ swimmers: await extractRosterFromPdf(bytes) });
    }
    return NextResponse.json({ events: await extractScheduleFromPdf(bytes) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
