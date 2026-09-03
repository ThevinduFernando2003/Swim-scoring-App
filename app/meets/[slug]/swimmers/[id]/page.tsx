import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamBadge } from "@/components/team-badge";
import { isMissingRelation, loadMeetBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SwimmerProfilePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();

  const full = await supabase
    .from("swimmers")
    .select("id, name, gender, age_group, age, slasu_number, registered, slasu_verified, present, team_id, teams(code, name)")
    .eq("id", id)
    .eq("meet_id", meet.id)
    .single();
  const swimmerQuery =
    full.error && isMissingRelation(full.error)
      ? await supabase
          .from("swimmers")
          .select("id, name, gender, age_group, team_id, teams(code, name)")
          .eq("id", id)
          .eq("meet_id", meet.id)
          .single()
      : full;
  const swimmer = swimmerQuery.data as {
    name: string;
    gender: string | null;
    age_group: string | null;
    age?: number | null;
    slasu_number?: string | null;
    registered?: boolean;
    slasu_verified?: boolean;
    present?: boolean;
    teams: { code: string; name: string } | { code: string; name: string }[] | null;
  } | null;
  if (!swimmer) notFound();

  const team = Array.isArray(swimmer.teams) ? swimmer.teams[0] : swimmer.teams;
  const { data: results } = await supabase
    .from("event_results")
    .select(
      "position, achievement, points_awarded, result_status, events(id, name, day, event_number, gender, event_type)",
    )
    .eq("swimmer_id", id)
    .order("id");

  const total = (results ?? []).reduce(
    (sum, row) => sum + (row.points_awarded ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/meets/${meet.slug}/swimmers`}
        className="text-sm font-semibold text-gold"
      >
        ← All swimmers
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Swimmer profile
        </p>
        <h1 className="text-3xl font-black text-cream sm:text-4xl">
          {swimmer.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-cream/80">
          <TeamBadge code={team?.code ?? "—"} />
          <span>{team?.name}</span>
          {swimmer.gender ? <span>· {swimmer.gender}</span> : null}
          {swimmer.age ? <span>· {swimmer.age}</span> : null}
          {swimmer.age_group ? <span>· {swimmer.age_group}</span> : null}
          {swimmer.slasu_number ? <span>· SLASU {swimmer.slasu_number}</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
          <span className={`rounded-full px-2 py-0.5 ${swimmer.registered ? "bg-gold text-navy" : "bg-white/10 text-cream/50"}`}>
            {swimmer.registered ? "Registered" : "Not marked registered"}
          </span>
          <span className={`rounded-full px-2 py-0.5 ${swimmer.slasu_verified ? "bg-gold text-navy" : "bg-white/10 text-cream/50"}`}>
            {swimmer.slasu_verified ? "SLASU confirmed" : "SLASU pending"}
          </span>
          <span className={`rounded-full px-2 py-0.5 ${swimmer.present ? "bg-gold text-navy" : "bg-white/10 text-cream/50"}`}>
            {swimmer.present ? "Present" : "Not checked in"}
          </span>
        </div>
        <p className="mt-4 font-mono text-4xl font-black text-gold">{total} pts</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(results ?? []).map((row, index) => {
              const event = Array.isArray(row.events) ? row.events[0] : row.events;
              return (
                <tr key={index} className="border-t border-white/10 bg-navy-mid/60">
                  <td className="px-4 py-3">
                    {event ? (
                      <Link
                        href={`/meets/${meet.slug}/events/${event.id}`}
                        className="font-semibold text-cream hover:text-gold"
                      >
                        Day {event.day} · {event.event_number}. {event.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-cream">
                    {row.position ?? row.result_status}
                  </td>
                  <td className="px-4 py-3 font-mono text-cream">
                    {row.achievement}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black">
                    {row.points_awarded}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
