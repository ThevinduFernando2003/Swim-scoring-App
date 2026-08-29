import type { EventType, ResultStatus } from "./types.ts";

export const POINTS = {
  individual: { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 },
  relay: { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1 },
} as const;

export function pointsFor(
  eventType: EventType,
  position: number | null | undefined,
  resultStatus: ResultStatus,
): number {
  if (resultStatus !== "finished") return 0;
  if (position == null || position < 1 || position > 6) return 0;
  const table = POINTS[eventType];
  return table[position as 1 | 2 | 3 | 4 | 5 | 6] ?? 0;
}
