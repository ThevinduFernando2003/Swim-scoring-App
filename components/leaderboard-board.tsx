"use client";

import { useEffect, useMemo, useState } from "react";
import { LastUpdated } from "@/components/last-updated";
import { TeamBadge } from "@/components/team-badge";
import { createClient } from "@/lib/supabase/client";
import { rankStandings } from "@/lib/standings";
import type { EventResult, MeetEvent, StandingRow, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "Overall" | "Men" | "Women";

export function LeaderboardBoard({
  initialTeams,
  initialEvents,
  initialResults,
}: {
  initialTeams: Team[];
  initialEvents: MeetEvent[];
  initialResults: EventResult[];
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [events, setEvents] = useState(initialEvents);
  const [results, setResults] = useState(initialResults);
  const [tab, setTab] = useState<Tab>("Overall");
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const [teamsRes, eventsRes, resultsRes] = await Promise.all([
        supabase.from("teams").select("id, code, name").order("code"),
        supabase
          .from("events")
          .select("id, day, event_number, name, gender, event_type, status"),
        supabase
          .from("event_results")
          .select(
            "id, event_id, position, swimmer_name, team_id, achievement, result_status, points_awarded",
          ),
      ]);
      if (teamsRes.data) setTeams(teamsRes.data as Team[]);
      if (eventsRes.data) setEvents(eventsRes.data as MeetEvent[]);
      if (resultsRes.data) setResults(resultsRes.data as EventResult[]);
      setUpdatedAt(Date.now());
    }

    const channel = supabase
      .channel("live-standings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_results" },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const standings = useMemo(() => {
    const filtered = results.filter((row) => {
      if (tab === "Overall") return true;
      return eventById.get(row.event_id)?.gender === tab;
    });
    return rankStandings(teams, filtered);
  }, [eventById, results, tab, teams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
            Live standings
          </p>
          <h1 className="text-3xl font-black tracking-tight text-cream sm:text-5xl">
            Leaderboard
          </h1>
        </div>
        <LastUpdated timestamp={updatedAt} />
      </div>

      <div className="flex rounded-lg border border-gold/30 bg-navy-mid p-1">
        {(["Overall", "Men", "Women"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "flex-1 rounded-md px-3 py-2.5 text-sm font-bold uppercase tracking-wide",
              tab === item
                ? "bg-gold text-navy"
                : "text-cream/70 hover:text-cream",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {standings.map((row) => (
          <StandingCard key={row.team_id} row={row} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gold/20 md:block">
        <table className="w-full text-left">
          <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr
                key={row.team_id}
                className="border-t border-white/10 bg-navy-mid/60"
              >
                <td className="px-4 py-4 font-mono text-2xl font-black text-gold">
                  {row.rank}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <TeamBadge code={row.code} />
                    <span className="text-lg font-semibold text-cream">
                      {row.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right font-mono text-3xl font-black text-cream">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandingCard({ row }: { row: StandingRow }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gold/20 bg-navy-mid p-4">
      <span className="w-10 font-mono text-3xl font-black text-gold">
        {row.rank}
      </span>
      <div className="min-w-0 flex-1">
        <TeamBadge code={row.code} />
        <p className="mt-1 truncate text-base font-semibold text-cream">
          {row.name}
        </p>
      </div>
      <span className="font-mono text-4xl font-black text-cream">
        {row.points}
      </span>
    </div>
  );
}
