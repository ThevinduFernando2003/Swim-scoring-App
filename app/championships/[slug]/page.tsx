import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetDirectory } from "@/components/meet-directory";
import { loadChampionshipBySlug, loadChampionshipEditions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChampionshipPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const championship = await loadChampionshipBySlug(supabase, slug);
  if (!championship) notFound();
  const editions = await loadChampionshipEditions(supabase, championship.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Championship series
        </p>
        <h1 className="text-3xl font-black text-cream sm:text-5xl">
          {championship.name}
        </h1>
        <p className="mt-2 max-w-2xl text-cream/70">
          Open a year to see that edition’s leaderboard, schedule, and records.
          Records carry forward across years.
        </p>
      </div>
      <MeetDirectory
        meets={editions}
        emptyLabel="No public editions yet."
      />
      <p className="text-sm text-cream/50">
        <Link href="/" className="text-gold">
          ← All meets
        </Link>
      </p>
    </div>
  );
}
