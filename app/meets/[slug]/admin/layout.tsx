import { notFound, redirect } from "next/navigation";
import { MeetAdminNav } from "@/components/meet-admin-nav";
import { loadMeetBySlug } from "@/lib/data";
import { getAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function MeetAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/meets/${slug}/admin`);
  }

  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();

  const access = await getAccess(supabase, user, meet.id);
  if (!access.canScore) {
    redirect("/admin");
  }

  return (
    <div>
      <MeetAdminNav meet={meet} access={access} />
      {children}
    </div>
  );
}
