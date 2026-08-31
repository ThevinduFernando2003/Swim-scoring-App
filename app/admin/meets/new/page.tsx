import { redirect } from "next/navigation";
import { NewMeetForm } from "@/components/new-meet-form";
import { isSuperAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Meet } from "@/lib/types";
import { parsePointsConfig } from "@/lib/points";

export const dynamic = "force-dynamic";

export default async function NewMeetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperAdmin(supabase, user.id))) redirect("/admin");

  const { data } = await supabase
    .from("meets")
    .select("id, slug, name, participant_label, status, points_config, pdfs_public")
    .order("name");

  const cloneSources: Meet[] = (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    participant_label: row.participant_label,
    status: row.status,
    points_config: parsePointsConfig(row.points_config),
    pdfs_public: row.pdfs_public !== false,
  }));

  return <NewMeetForm cloneSources={cloneSources} />;
}
