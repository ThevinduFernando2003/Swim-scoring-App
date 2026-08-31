import type { EventType, PointsConfig, ResultStatus } from "./types.ts";

export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  max_places: 6,
  individual: { "1": 7, "2": 5, "3": 4, "4": 3, "5": 2, "6": 1 },
  relay: { "1": 10, "2": 7, "3": 5, "4": 3, "5": 2, "6": 1 },
};

/** @deprecated Use DEFAULT_POINTS_CONFIG. Kept so existing tests and call sites still compile. */
export const POINTS = {
  individual: { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 },
  relay: { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1 },
} as const;

export function emptyPlaceMap(maxPlaces: number, fill = 0): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 1; i <= maxPlaces; i += 1) {
    out[String(i)] = fill;
  }
  return out;
}

export function resizePointsTable(
  table: Record<string, number>,
  maxPlaces: number,
  fallback: Record<string, number> = {},
): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 1; i <= maxPlaces; i += 1) {
    const key = String(i);
    const current = table[key];
    const inherited = fallback[key];
    out[key] = Number(current ?? inherited ?? 0);
  }
  return out;
}

export function parsePointsConfig(raw: unknown): PointsConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_POINTS_CONFIG };
  const value = raw as Partial<PointsConfig>;
  const maxPlaces = Math.max(1, Math.min(32, Number(value.max_places) || 6));
  return {
    max_places: maxPlaces,
    individual: resizePointsTable(
      value.individual ?? {},
      maxPlaces,
      DEFAULT_POINTS_CONFIG.individual,
    ),
    relay: resizePointsTable(
      value.relay ?? {},
      maxPlaces,
      DEFAULT_POINTS_CONFIG.relay,
    ),
  };
}

export function withMaxPlaces(config: PointsConfig, maxPlaces: number): PointsConfig {
  const n = Math.max(1, Math.min(32, Math.floor(maxPlaces) || 1));
  return {
    max_places: n,
    individual: resizePointsTable(config.individual, n),
    relay: resizePointsTable(config.relay, n),
  };
}

export function pointsFor(
  eventType: EventType,
  position: number | null | undefined,
  resultStatus: ResultStatus,
  config: PointsConfig = DEFAULT_POINTS_CONFIG,
): number {
  if (resultStatus !== "finished") return 0;
  if (position == null || position < 1 || position > config.max_places) return 0;
  const table = config[eventType] ?? {};
  return Number(table[String(position)] ?? 0);
}
