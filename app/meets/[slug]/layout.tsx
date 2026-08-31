import { notFound } from "next/navigation";
import { MeetSubnav } from "@/components/meet-subnav";
import { loadMeetBySlug } from "@/lib/data";
import { getAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export default async function MeetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = user ? await getAccess(supabase, user, meet.id) : null;

  return (
    <>
      <MeetSubnav meet={meet} isAdmin={Boolean(access?.canScore)} />
      {children}
    </>
  );
}
