/** Parse a swimming time into milliseconds. Returns null if it is not a clock time. */
export function parseSwimTimeMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().replace(/,/g, ".");
  if (!text || /^(DNS|DQ|DNF|NS|WD|SCR|NMR)$/i.test(text)) return null;

  const hourClock = text.match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
  if (hourClock) {
    return toMs(Number(hourClock[1]), Number(hourClock[2]), Number(hourClock[3]), hourClock[4]);
  }

  const minuteClock = text.match(/^(\d{1,2}):(\d{2})\.(\d{1,3})$/);
  if (minuteClock) {
    return toMs(0, Number(minuteClock[1]), Number(minuteClock[2]), minuteClock[3]);
  }

  const dottedMinute = text.match(/^(\d{1,2})\.(\d{2})\.(\d{1,3})$/);
  if (dottedMinute) {
    return toMs(0, Number(dottedMinute[1]), Number(dottedMinute[2]), dottedMinute[3]);
  }

  const secondsOnly = text.match(/^(\d{1,3})\.(\d{1,3})$/);
  if (secondsOnly) {
    return toMs(0, 0, Number(secondsOnly[1]), secondsOnly[2]);
  }

  return null;
}

function toMs(hours: number, minutes: number, seconds: number, frac: string) {
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  if (minutes > 59 || seconds > 59) return null;
  const hundredths = Number(frac.padEnd(2, "0").slice(0, 2));
  if (!Number.isFinite(hundredths)) return null;
  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + hundredths * 10;
}

export function isFasterTime(next: string, current: string): boolean | null {
  const a = parseSwimTimeMs(next);
  const b = parseSwimTimeMs(current);
  if (a == null || b == null) return null;
  return a < b;
}
