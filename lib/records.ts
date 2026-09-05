import { parseSwimTimeMs } from "./times.ts";
import type { PublishRow } from "./types.ts";

export type StoredRecord = {
  event_key: string;
  event_name: string;
  gender: string;
  event_type: string;
  time_text: string;
  time_ms: number;
  swimmer_name: string;
  team_code: string | null;
  year: number | null;
};

export function eventRecordKey(name: string, gender: string, eventType: string) {
  const base = name
    .replace(/\b(prelim(?:inary)?s?|heats?|timed finals?|finals?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `${base}|${gender}|${eventType}`;
}

export function applyNmrFlags(
  rows: PublishRow[],
  current: StoredRecord | null,
): { rows: PublishRow[]; brokenBy: PublishRow[] } {
  if (!current) {
    return { rows: rows.map((row) => ({ ...row, record_flag: null })), brokenBy: [] };
  }
  const brokenBy: PublishRow[] = [];
  const next = rows.map((row) => {
    const ms = parseSwimTimeMs(row.achievement);
    const broken =
      row.result_status === "finished" && ms != null && ms < current.time_ms;
    const flagged = { ...row, record_flag: broken ? "NMR" : null };
    if (broken) brokenBy.push(flagged);
    return flagged;
  });
  return { rows: next, brokenBy };
}

export function nextCurrentRecord(
  brokenBy: PublishRow[],
  event: { name: string; gender: string; event_type: string },
  teamCodeById: Map<number, string>,
  year: number | null,
): StoredRecord | null {
  if (brokenBy.length === 0) return null;
  const fastest = [...brokenBy].sort((a, b) => {
    return (parseSwimTimeMs(a.achievement) ?? 0) - (parseSwimTimeMs(b.achievement) ?? 0);
  })[0];
  return {
    event_key: eventRecordKey(event.name, event.gender, event.event_type),
    event_name: event.name.replace(/\b(prelim(?:inary)?s?|heats?|timed finals?|finals?)\b/gi, "").replace(/\s+/g, " ").trim(),
    gender: event.gender,
    event_type: event.event_type,
    time_text: fastest.achievement,
    time_ms: parseSwimTimeMs(fastest.achievement) ?? 0,
    swimmer_name: fastest.swimmer_name,
    team_code: teamCodeById.get(fastest.team_id) ?? null,
    year,
  };
}
