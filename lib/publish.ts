import { pointsFor } from "./points.ts";
import type {
  EventType,
  PublishRow,
  ReviewedResult,
  Team,
} from "./types.ts";

export function unknownTeamCodes(
  rows: ReviewedResult[],
  teams: Team[],
): string[] {
  const known = new Set(teams.map((team) => team.code.toUpperCase()));
  const unknown = new Set<string>();
  for (const row of rows) {
    const code = row.team_code.trim().toUpperCase();
    if (!code) {
      unknown.add("(blank)");
      continue;
    }
    if (!known.has(code)) unknown.add(code);
  }
  return [...unknown];
}

export function toPublishRows(
  eventType: EventType,
  rows: ReviewedResult[],
  teams: Team[],
): { rows: PublishRow[]; unknownCodes: string[] } {
  const byCode = new Map(teams.map((team) => [team.code.toUpperCase(), team]));
  const unknownCodes = unknownTeamCodes(rows, teams);
  if (unknownCodes.length > 0) {
    return { rows: [], unknownCodes };
  }

  const publishRows: PublishRow[] = rows.map((row) => {
    const team = byCode.get(row.team_code.trim().toUpperCase())!;
    const position = row.position == null || Number.isNaN(row.position)
      ? null
      : row.position;
    return {
      position,
      swimmer_name: row.swimmer_name.trim(),
      team_id: team.id,
      achievement: row.achievement.trim(),
      result_status: row.result_status,
      points_awarded: pointsFor(eventType, position, row.result_status),
    };
  });

  return { rows: publishRows, unknownCodes: [] };
}
