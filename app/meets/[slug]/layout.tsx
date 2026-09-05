import { notFound } from "next/navigation";
import { EditionSwitcher } from "@/components/edition-switcher";
import { MeetSponsors } from "@/components/meet-sponsors";
import { MeetSubnav } from "@/components/meet-subnav";
import { NextResultsBanner } from "@/components/next-results-banner";
import {
  loadChampionshipEditions,
  loadChampionships,
  loadMeetBySlug,
  loadSponsors,
} from "@/lib/data";
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
  const sponsors = await loadSponsors(supabase, meet.id);
  const championships = meet.championship_id
    ? await loadChampionships(supabase)
    : [];
  const championship = championships.find((item) => item.id === meet.championship_id) ?? null;
  const editions = championship
    ? await loadChampionshipEditions(supabase, championship.id)
    : [];

  return (
    <div
      className="relative"
      style={
        meet.primary_color
          ? ({ ["--gold"]: meet.primary_color } as React.CSSProperties)
          : undefined
      }
    >
      {meet.background_url ? (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${meet.background_url})` }}
        />
      ) : (
        <MeetSponsors sponsors={sponsors} placement="background" />
      )}
      <div className="relative z-10">
        {championship ? (
          <EditionSwitcher
            championship={championship}
            editions={editions}
            currentSlug={meet.slug}
          />
        ) : null}
        <MeetSubnav
          meet={meet}
          isAdmin={Boolean(access?.canScore)}
          sponsors={sponsors}
        />
        {meet.next_results_at ? (
          <div className="mb-6">
            <NextResultsBanner at={meet.next_results_at} />
          </div>
        ) : null}
        {children}
        <div className="mt-10 border-t border-gold/20">
          <MeetSponsors sponsors={sponsors} placement="footer" />
        </div>
      </div>
    </div>
  );
}
