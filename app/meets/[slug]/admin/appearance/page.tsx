import { notFound, redirect } from "next/navigation";
import { MeetBrandingForm } from "@/components/meet-branding-form";
import { loadMeetBySlug, loadSponsors } from "@/lib/data";
import { getAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppearancePage({
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
  const sponsors = await loadSponsors(supabase, meet.id);
  return <MeetBrandingForm meet={meet} sponsors={sponsors} />;
}
