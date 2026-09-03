import { NextResponse } from "next/server";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

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

    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "logo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach an image" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please upload an image file" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.replace(/[^\w]/g, "") || "png";
    const path = `${meet.slug}/${kind}-${Date.now()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from("meet-assets").upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data } = supabase.storage.from("meet-assets").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
