import { parseSwimTimeMs } from "./times.ts";
import type { Team } from "./types.ts";

export type QualifyBand = "qualified" | "reserve" | "out";

export type QualifySource = {
  swimmer_name: string | null;
  team_id: number;
  achievement: string | null;
  result_status: string;
};

export type QualifierRow = {
  swimmer_name: string;
  team_id: number;
  team_code: string;
  achievement: string;
  place: number;
  time_ms: number;
  band: QualifyBand;
};

export function qualifyFromResults(
  results: QualifySource[],
  teams: Team[],
  qualifyCount = 8,
  reserveCount = 2,
): QualifierRow[] {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const finished = results
    .filter((row) => row.result_status === "finished")
    .map((row) => ({
      swimmer_name: (row.swimmer_name ?? "").trim(),
      team_id: row.team_id,
      achievement: (row.achievement ?? "").trim(),
      time_ms: parseSwimTimeMs(row.achievement),
    }))
    .filter((row) => row.time_ms != null && row.swimmer_name) as Array<{
      swimmer_name: string;
      team_id: number;
      achievement: string;
      time_ms: number;
    }>;

  finished.sort((a, b) => a.time_ms - b.time_ms || a.swimmer_name.localeCompare(b.swimmer_name));

  const places: number[] = [];
  let place = 1;
  for (let i = 0; i < finished.length; i += 1) {
    if (i > 0 && finished[i].time_ms === finished[i - 1].time_ms) {
      places.push(places[i - 1]);
    } else {
      places.push(place);
    }
    place = i + 2;
  }

  const cutoff = finished[qualifyCount - 1]?.time_ms;
  let reserved = 0;
  return finished.map((row, index) => {
    let band: QualifyBand = "out";
    if (cutoff == null || row.time_ms <= cutoff) {
      band = "qualified";
    } else if (reserved < reserveCount) {
      band = "reserve";
      reserved += 1;
    }
    return {
      ...row,
      team_code: byId.get(row.team_id)?.code ?? "—",
      place: places[index],
      band,
    };
  });
}

export function detectRound(name: string): "prelim" | "final" | "timed_final" {
  if (/\b(prelim(?:inary)?s?|heats?)\b/i.test(name)) return "prelim";
  if (/\b(finals?)\b/i.test(name)) return "final";
  return "timed_final";
}

export function detectSession(name: string, round: string): "morning" | "evening" | "unspecified" {
  if (/\bmorning\b/i.test(name)) return "morning";
  if (/\bevening\b/i.test(name)) return "evening";
  if (round === "prelim") return "morning";
  if (round === "final") return "evening";
  return "unspecified";
}

export function finalNameFromPrelim(name: string) {
  const stripped = name.replace(/\b(prelim(?:inary)?s?|heats?)\b/gi, "").replace(/\s+/g, " ").trim();
  if (/\bfinals?\b/i.test(stripped)) return stripped;
  return `${stripped} Final`.replace(/\s+/g, " ").trim();
}
