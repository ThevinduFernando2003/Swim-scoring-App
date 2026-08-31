import type { StandingRow, SwimmerStandingRow, Team } from "./types.ts";

export const TIEBREAK = "countback" as const;

export type PlaceSource = {
  team_id: number;
  position: number | null;
  result_status: string;
  points_awarded: number;
};

export type SwimmerPlaceSource = {
  swimmer_id: string;
  name: string;
  team_id: number;
  team_code: string;
  team_name: string;
  points_awarded: number;
};

function emptyPlaces(maxPlaces: number): number[] {
  return Array.from({ length: maxPlaces }, () => 0);
}

export function compareStandings(a: StandingRow, b: StandingRow) {
  if (b.points !== a.points) return b.points - a.points;
  if (TIEBREAK === "countback") {
    const len = Math.max(a.placeCounts.length, b.placeCounts.length);
    for (let i = 0; i < len; i += 1) {
      const av = a.placeCounts[i] ?? 0;
      const bv = b.placeCounts[i] ?? 0;
      if (bv !== av) return bv - av;
    }
  }
  return a.code.localeCompare(b.code);
}

export function rankStandings(
  teams: Team[],
  results: PlaceSource[],
  maxPlaces = 6,
): StandingRow[] {
  const byTeam = new Map<number, StandingRow>();

  for (const team of teams) {
    byTeam.set(team.id, {
      team_id: team.id,
      code: team.code,
      name: team.name,
      points: 0,
      placeCounts: emptyPlaces(maxPlaces),
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
      row.position <= maxPlaces
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

export function rankSwimmers(rows: SwimmerPlaceSource[]): SwimmerStandingRow[] {
  const byId = new Map<string, SwimmerStandingRow>();
  for (const row of rows) {
    if (!row.swimmer_id) continue;
    const current = byId.get(row.swimmer_id);
    if (!current) {
      byId.set(row.swimmer_id, {
        swimmer_id: row.swimmer_id,
        name: row.name,
        team_id: row.team_id,
        team_code: row.team_code,
        team_name: row.team_name,
        points: row.points_awarded ?? 0,
        events_entered: 1,
        rank: 0,
      });
    } else {
      current.points += row.points_awarded ?? 0;
      current.events_entered += 1;
    }
  }

  const ranked = [...byId.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.events_entered !== a.events_entered) return b.events_entered - a.events_entered;
    return a.name.localeCompare(b.name);
  });
  ranked.forEach((row, index) => {
    const prev = ranked[index - 1];
    if (prev && prev.points === row.points) {
      row.rank = prev.rank;
    } else {
      row.rank = index + 1;
    }
  });
  return ranked;
}
