import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMeetAccess } from "@/lib/auth";
import { loadMeetBySlug } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  email: z.string().email(),
  role: z.enum(["official", "meet_admin"]).default("official"),
});

const deleteSchema = z.object({
  user_id: z.string().uuid(),
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
    const body = postSchema.parse(await request.json());
    if (!access.isSuperAdmin && body.role === "meet_admin") {
      return NextResponse.json(
        { error: "Only a super admin can promote a meet admin" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const email = body.email.trim().toLowerCase();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    let user = list?.users.find((item) => item.email?.toLowerCase() === email);
    let invited = false;
    if (!user) {
      const invitedUser = await admin.auth.admin.inviteUserByEmail(email);
      if (invitedUser.error || !invitedUser.data.user) {
        return NextResponse.json(
          {
            error:
              invitedUser.error?.message ||
              "No account with that email. Create the user in Supabase Auth first, or check invite email settings.",
          },
          { status: 400 },
        );
      }
      user = invitedUser.data.user;
      invited = true;
    }

    const { error } = await supabase.from("meet_roles").upsert(
      {
        meet_id: meet.id,
        user_id: user.id,
        role: body.role,
      },
      { onConflict: "meet_id,user_id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      message: invited
        ? "Invite sent. They can set a password from the email, then sign in."
        : "Official added.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
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
    const body = deleteSchema.parse(await request.json());
    const { error } = await supabase
      .from("meet_roles")
      .delete()
      .eq("meet_id", meet.id)
      .eq("user_id", body.user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Remove failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
