import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublishRow, Swimmer } from "./types.ts";

export function foldSwimmerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'\-,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a: string, b: string): boolean {
  const fa = foldSwimmerName(a);
  const fb = foldSwimmerName(b);
  return Boolean(fa) && fa === fb;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr.push(Math.min(prev[j + 1] + 1, curr[j] + 1, prev[j] + cost));
    }
    for (let j = 0; j < curr.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function isNearDuplicateName(a: string, b: string): boolean {
  if (namesMatch(a, b)) return false;
  const fa = foldSwimmerName(a);
  const fb = foldSwimmerName(b);
  if (!fa || !fb) return false;
  const dist = levenshtein(fa, fb);
  const maxLen = Math.max(fa.length, fb.length);
  return dist > 0 && (dist <= 2 || (maxLen >= 6 && dist / maxLen <= 0.2));
}

export type DuplicateWarning = {
  rowIndex: number;
  name: string;
  teamCode: string;
  matches: string[];
};

export function findDuplicateWarnings(
  rows: { swimmer_name: string; team_code: string }[],
  existing: { name: string; team_code?: string; team_id?: number }[],
  teams: { id: number; code: string }[],
): DuplicateWarning[] {
  const codeById = new Map(teams.map((team) => [team.id, team.code.toUpperCase()]));
  const warnings: DuplicateWarning[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const name = rows[i].swimmer_name.trim();
    const code = rows[i].team_code.trim().toUpperCase();
    if (!name || !code) continue;
    const matches = new Set<string>();

    for (const swimmer of existing) {
      const swimmerCode = (
        swimmer.team_code ?? codeById.get(swimmer.team_id ?? -1) ?? ""
      ).toUpperCase();
      if (swimmerCode !== code) continue;
      if (isNearDuplicateName(name, swimmer.name)) matches.add(swimmer.name);
    }

    for (let j = 0; j < rows.length; j += 1) {
      if (i === j) continue;
      if (rows[j].team_code.trim().toUpperCase() !== code) continue;
      const other = rows[j].swimmer_name.trim();
      if (other && isNearDuplicateName(name, other)) matches.add(other);
    }

    if (matches.size > 0) {
      warnings.push({
        rowIndex: i,
        name,
        teamCode: code,
        matches: [...matches],
      });
    }
  }

  return warnings;
}

export async function attachSwimmers(
  supabase: SupabaseClient,
  meetId: string,
  rows: PublishRow[],
  gender: string | null,
): Promise<PublishRow[]> {
  const { data, error } = await supabase
    .from("swimmers")
    .select("id, meet_id, team_id, name, gender, age_group")
    .eq("meet_id", meetId);
  if (error) throw error;

  const existing = (data ?? []) as Swimmer[];
  const byKey = new Map<string, Swimmer>();
  for (const swimmer of existing) {
    byKey.set(`${swimmer.team_id}:${foldSwimmerName(swimmer.name)}`, swimmer);
  }

  const out: PublishRow[] = [];
  for (const row of rows) {
    const folded = foldSwimmerName(row.swimmer_name);
    if (!folded) {
      out.push({ ...row, swimmer_id: null });
      continue;
    }
    const key = `${row.team_id}:${folded}`;
    let swimmer = byKey.get(key);
    if (!swimmer) {
      const insert = await supabase
        .from("swimmers")
        .insert({
          meet_id: meetId,
          team_id: row.team_id,
          name: row.swimmer_name.trim(),
          gender,
        })
        .select("id, meet_id, team_id, name, gender, age_group")
        .single();

      if (insert.error) {
        if (insert.error.code === "23505") {
          const retry = await supabase
            .from("swimmers")
            .select("id, meet_id, team_id, name, gender, age_group")
            .eq("meet_id", meetId)
            .eq("team_id", row.team_id)
            .eq("name", row.swimmer_name.trim())
            .single();
          if (retry.error || !retry.data) throw insert.error;
          swimmer = retry.data as Swimmer;
        } else {
          throw insert.error;
        }
      } else {
        swimmer = insert.data as Swimmer;
      }
      byKey.set(key, swimmer);
    }
    out.push({ ...row, swimmer_id: swimmer.id });
  }
  return out;
}
