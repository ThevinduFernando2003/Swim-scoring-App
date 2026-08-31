import { notFound } from "next/navigation";
import { SwimmerSearch } from "@/components/swimmer-search";
import { loadMeetBySlug, loadSwimmers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SwimmersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();
  const swimmers = await loadSwimmers(supabase, meet.id);
  return (
    <SwimmerSearch
      slug={meet.slug}
      swimmers={swimmers}
      participantLabel={meet.participant_label}
    />
  );
}
