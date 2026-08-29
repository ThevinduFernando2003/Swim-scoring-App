import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamBadge } from "@/components/team-badge";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { eventId } = await params;
  const id = Number(eventId);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, day, event_number, name, gender, event_type, status")
    .eq("id", id)
    .single();

  if (!event || event.status !== "confirmed") notFound();

  const { data: results } = await supabase
    .from("event_results")
    .select(
      "position, swimmer_name, achievement, points_awarded, result_status, teams(code, name)",
    )
    .eq("event_id", id)
    .eq("result_status", "finished")
    .gte("position", 1)
    .lte("position", 6)
    .order("position");

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <Link href="/schedule" className="text-sm font-semibold text-gold">
        ← Schedule
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Day {event.day} · Event {event.event_number} · {event.gender}
        </p>
        <h1 className="text-3xl font-black text-cream sm:text-4xl">
          {event.name}
        </h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-gold/20">
        <table className="w-full text-left">
          <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
            <tr>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(results ?? []).map((row) => {
              const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
              const medal =
                row.position && row.position <= 3 ? medals[row.position - 1] : "";
              return (
                <tr
                  key={`${row.position}-${row.swimmer_name}`}
                  className="border-t border-white/10 bg-navy-mid/60"
                >
                  <td className="px-4 py-4 font-mono text-xl font-black text-gold">
                    {medal} {row.position}
                  </td>
                  <td className="px-4 py-4 font-semibold text-cream">
                    {row.swimmer_name}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <TeamBadge code={team?.code ?? "—"} />
                      <span className="hidden text-sm text-cream/70 sm:inline">
                        {team?.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-cream">
                    {row.achievement}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xl font-black text-cream">
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
