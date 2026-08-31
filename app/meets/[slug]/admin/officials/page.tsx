import { notFound, redirect } from "next/navigation";
import { OfficialsManager } from "@/components/officials-manager";
import { loadMeetBySlug } from "@/lib/data";
import { getAccess } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OfficialsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();
  const access = await getAccess(supabase, user, meet.id);
  if (!access.canManage) redirect(`/meets/${slug}/admin`);

  const { data: roles } = await supabase
    .from("meet_roles")
    .select("id, user_id, role")
    .eq("meet_id", meet.id)
    .order("role");

  const officials = await Promise.all(
    (roles ?? []).map(async (row) => {
      let email: string | null = null;
      try {
        const admin = createAdminClient();
        const { data } = await admin.auth.admin.getUserById(row.user_id);
        email = data.user?.email ?? null;
      } catch {
        email = null;
      }
      return { ...row, email };
    }),
  );

  return <OfficialsManager slug={meet.slug} officials={officials} />;
}
