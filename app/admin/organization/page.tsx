import { redirect } from "next/navigation";
import { OrgSettingsForm } from "@/components/org-settings-form";
import { loadOrgSettings } from "@/lib/data";
import { isSuperAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperAdmin(supabase, user.id))) redirect("/admin");
  const org = await loadOrgSettings(supabase);
  return <OrgSettingsForm org={org} />;
}
