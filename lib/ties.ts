import { parseSwimTimeMs } from "./times.ts";
import type { ReviewedResult } from "./types.ts";

/** Olympic ranking: equal times share a place and the next place is skipped (1, 1, 3). */
export function applyTiedPlaces(rows: ReviewedResult[]): ReviewedResult[] {
  const next = rows.map((row) => ({ ...row }));
  const finished = next
    .map((row, index) => ({
      index,
      ms: parseSwimTimeMs(row.achievement),
      position: row.position,
    }))
    .filter((item, index) => next[index].result_status === "finished" && item.ms != null);

  if (finished.length === 0) return next;

  finished.sort((a, b) => {
    if (a.ms !== b.ms) return (a.ms ?? 0) - (b.ms ?? 0);
    return (a.position ?? 99) - (b.position ?? 99);
  });

  let place = 1;
  let i = 0;
  while (i < finished.length) {
    const time = finished[i].ms;
    let j = i + 1;
    while (j < finished.length && finished[j].ms === time) j += 1;
    for (let k = i; k < j; k += 1) {
      next[finished[k].index].position = place;
    }
    place += j - i;
    i = j;
  }
  return next;
}

export function tiedPositions(rows: { position: number | null; result_status?: string }[]) {
  const counts = new Map<number, number>();
  for (const row of rows) {
    if (row.position == null) continue;
    if (row.result_status && row.result_status !== "finished") continue;
    counts.set(row.position, (counts.get(row.position) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([position]) => position),
  );
}

export function formatPlace(position: number | null, tied: boolean) {
  if (position == null) return "—";
  return tied ? `${position}=` : String(position);
}
