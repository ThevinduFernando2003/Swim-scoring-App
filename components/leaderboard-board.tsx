"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DownloadCsvButton } from "@/components/download-csv-button";
import { LastUpdated } from "@/components/last-updated";
import { TeamBadge } from "@/components/team-badge";
import { createClient } from "@/lib/supabase/client";
import { rankStandings, rankSwimmers } from "@/lib/standings";
import type {
  EventResult,
  Meet,
  MeetEvent,
  StandingRow,
  Swimmer,
  Team,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeaderboardBoard({
  meet,
  initialTeams,
  initialEvents,
  initialResults,
  initialSwimmers,
}: {
  meet: Meet;
  initialTeams: Team[];
  initialEvents: MeetEvent[];
  initialResults: EventResult[];
  initialSwimmers: Swimmer[];
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [events, setEvents] = useState(initialEvents);
  const [results, setResults] = useState(initialResults);
  const [swimmers, setSwimmers] = useState(initialSwimmers);
  const genderTabs = useMemo(() => {
    const found = [...new Set(events.map((event) => event.gender))];
    return ["Overall", ...found] as string[];
  }, [events]);
  const [tab, setTab] = useState("Overall");
  const [board, setBoard] = useState<"teams" | "swimmers">("teams");
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const [teamsRes, eventsRes, resultsRes, swimmersRes] = await Promise.all([
        supabase
          .from("teams")
          .select("id, code, name, meet_id")
          .eq("meet_id", meet.id)
          .order("code"),
        supabase
          .from("events")
          .select("id, meet_id, day, event_number, name, gender, event_type, status")
          .eq("meet_id", meet.id),
        supabase
          .from("event_results")
          .select(
            "id, event_id, position, swimmer_name, team_id, achievement, result_status, points_awarded, swimmer_id",
          ),
        supabase
          .from("swimmers")
          .select("id, meet_id, team_id, name, gender, age_group, teams(code, name)")
          .eq("meet_id", meet.id),
      ]);
      if (teamsRes.data) setTeams(teamsRes.data as Team[]);
      if (eventsRes.data) {
        setEvents(eventsRes.data as MeetEvent[]);
        const ids = new Set((eventsRes.data as MeetEvent[]).map((event) => event.id));
        if (resultsRes.data) {
          setResults(
            (resultsRes.data as EventResult[]).filter((row) => ids.has(row.event_id)),
          );
        }
      }
      if (swimmersRes.data) {
        setSwimmers(
          (swimmersRes.data as Array<Swimmer & { teams?: { code: string; name: string } | Array<{ code: string; name: string }> }>).map(
            (row) => {
              const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
              return {
                ...row,
                team_code: team?.code,
                team_name: team?.name,
              };
            },
          ),
        );
      }
      setUpdatedAt(Date.now());
    }

    const channel = supabase
      .channel(`live-standings-${meet.id}`)
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
  }, [meet.id]);

  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const swimmerById = useMemo(
    () => new Map(swimmers.map((swimmer) => [swimmer.id, swimmer])),
    [swimmers],
  );

  const filteredResults = useMemo(() => {
    return results.filter((row) => {
      if (tab === "Overall") return true;
      return eventById.get(row.event_id)?.gender === tab;
    });
  }, [eventById, results, tab]);

  const standings = useMemo(
    () => rankStandings(teams, filteredResults, meet.points_config.max_places),
    [filteredResults, meet.points_config.max_places, teams],
  );

  const swimmerStandings = useMemo(() => {
    return rankSwimmers(
      filteredResults
        .filter((row) => row.swimmer_id)
        .map((row) => {
          const swimmer = swimmerById.get(row.swimmer_id as string);
          const team = teamById.get(row.team_id);
          return {
            swimmer_id: row.swimmer_id as string,
            name: swimmer?.name ?? row.swimmer_name ?? "Unknown",
            team_id: row.team_id,
            team_code: swimmer?.team_code ?? team?.code ?? "",
            team_name: swimmer?.team_name ?? team?.name ?? "",
            points_awarded: row.points_awarded,
          };
        }),
    );
  }, [filteredResults, swimmerById, teamById]);

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
        <div className="flex flex-wrap items-center gap-2">
          <LastUpdated timestamp={updatedAt} />
          <DownloadCsvButton
            filename={`${meet.slug}-standings-${tab.toLowerCase()}.csv`}
            label="Download standings (CSV)"
            rows={[
              ["Rank", meet.participant_label, "Code", "Points"],
              ...standings.map((row) => [row.rank, row.name, row.code, row.points]),
            ]}
          />
        </div>
      </div>

      <div className="flex rounded-lg border border-gold/30 bg-navy-mid p-1">
        {(["teams", "swimmers"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setBoard(item)}
            className={cn(
              "flex-1 rounded-md px-3 py-2.5 text-sm font-bold uppercase tracking-wide",
              board === item ? "bg-gold text-navy" : "text-cream/70 hover:text-cream",
            )}
          >
            {item === "teams" ? meet.participant_label + "s" : "Top individuals"}
          </button>
        ))}
      </div>

      <div className="flex rounded-lg border border-gold/30 bg-navy-mid p-1">
        {genderTabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "flex-1 rounded-md px-3 py-2.5 text-sm font-bold uppercase tracking-wide",
              tab === item ? "bg-gold text-navy" : "text-cream/70 hover:text-cream",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {board === "teams" ? (
        <>
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
                  <th className="px-4 py-3">{meet.participant_label}</th>
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
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gold/20">
          <table className="w-full text-left">
            <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Swimmer</th>
                <th className="px-4 py-3">{meet.participant_label}</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {swimmerStandings.slice(0, 50).map((row) => (
                <tr key={row.swimmer_id} className="border-t border-white/10 bg-navy-mid/60">
                  <td className="px-4 py-3 font-mono text-xl font-black text-gold">
                    {row.rank}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/meets/${meet.slug}/swimmers/${row.swimmer_id}`}
                      className="font-semibold text-cream hover:text-gold"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-cream/80">
                    <TeamBadge code={row.team_code} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xl font-black">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {swimmerStandings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-cream/60">
              Individual scores appear after results are published with swimmer names.
            </p>
          ) : null}
        </div>
      )}
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
