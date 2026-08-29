import type { StandingRow, Team } from "./types.ts";

export const TIEBREAK = "countback" as const;

export type PlaceSource = {
  team_id: number;
  position: number | null;
  result_status: string;
  points_awarded: number;
};

function emptyPlaces(): [number, number, number, number, number, number] {
  return [0, 0, 0, 0, 0, 0];
}

export function compareStandings(a: StandingRow, b: StandingRow) {
  if (b.points !== a.points) return b.points - a.points;
  if (TIEBREAK === "countback") {
    for (let i = 0; i < 6; i += 1) {
      if (b.placeCounts[i] !== a.placeCounts[i]) {
        return b.placeCounts[i] - a.placeCounts[i];
      }
    }
  }
  return a.code.localeCompare(b.code);
}

export function rankStandings(
  teams: Team[],
  results: PlaceSource[],
): StandingRow[] {
  const byTeam = new Map<number, StandingRow>();

  for (const team of teams) {
    byTeam.set(team.id, {
      team_id: team.id,
      code: team.code,
      name: team.name,
      points: 0,
      placeCounts: emptyPlaces(),
      rank: 0,
    });
  }

  for (const row of results) {
    const standing = byTeam.get(row.team_id);
    if (!standing) continue;
    standing.points += row.points_awarded ?? 0;
    if (
      row.result_status === "finished" &&
      row.position != null &&
      row.position >= 1 &&
      row.position <= 6
    ) {
      standing.placeCounts[row.position - 1] += 1;
    }
  }

  const ranked = [...byTeam.values()].sort(compareStandings);
  ranked.forEach((row, index) => {
    const prev = ranked[index - 1];
    if (prev && compareStandings(row, prev) === 0) {
      row.rank = prev.rank;
    } else {
      row.rank = index + 1;
    }
  });
  return ranked;
}
