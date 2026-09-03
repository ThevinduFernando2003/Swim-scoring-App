import { notFound } from "next/navigation";
import { PublicCheckIn } from "@/components/public-check-in";
import { loadMeetBySlug, loadSwimmers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();
  const swimmers = await loadSwimmers(supabase, meet.id);
  return <PublicCheckIn meet={meet} swimmers={swimmers} />;
}
