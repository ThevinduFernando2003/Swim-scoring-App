import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requireMeetAccess } from "@/lib/auth";
import { extractResultsFromPdf, parseExtractionJson } from "@/lib/extraction";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { user, access } = await requireMeetAccess(event.meet_id);
    if (!access.canScore) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limited = rateLimit(`extract:${user.id}`, 8, 10 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        {
          error: `Too many PDF extractions. Try again in ${limited.retryAfterSec}s.`,
        },
        { status: 429 },
      );
    }

    const { data: meet } = await supabase
      .from("meets")
      .select("status, slug")
      .eq("id", event.meet_id)
      .single();
    if (meet?.status === "completed" && !access.isSuperAdmin) {
      return NextResponse.json(
        { error: "This meet is completed and read-only" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const useFixture = formData.get("useFixture") === "true";
    const file = formData.get("file");

    let extraction;
    let filePath = "manual/no-file";

    if (useFixture && process.env.NODE_ENV !== "production") {
      const raw = readFileSync(
        join(process.cwd(), "fixtures/event-5-results.json"),
        "utf8",
      );
      extraction = parseExtractionJson(raw);
      filePath = "fixtures/event-5-results.json";
    } else if (file instanceof File) {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Please upload a PDF result sheet" },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const prefix = meet?.slug ? `${meet.slug}/${id}` : String(id);
      filePath = `${prefix}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("result-pdfs")
        .upload(filePath, bytes, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) {
        return NextResponse.json(
          { error: uploadError.message },
          { status: 500 },
        );
      }
      extraction = await extractResultsFromPdf(bytes);
    } else {
      return NextResponse.json(
        { error: "Attach a PDF or use the review table to enter results manually" },
        { status: 400 },
      );
    }

    const { data: upload, error: insertError } = await supabase
      .from("uploads")
      .insert({
        event_id: id,
        meet_id: event.meet_id,
        file_path: filePath,
        raw_extraction: extraction,
        uploaded_by: user.email ?? user.id,
        confirmed: false,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (event.status !== "confirmed") {
      await supabase.rpc("mark_event_pending_review", { p_event_id: id });
    }

    return NextResponse.json({
      uploadId: upload?.id ?? null,
      extraction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
