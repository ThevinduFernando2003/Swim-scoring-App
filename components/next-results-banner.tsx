"use client";

import { useEffect, useState } from "react";

export function NextResultsBanner({ at }: { at: string }) {
  const target = new Date(at).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const delta = target - now;
  const when = new Date(at).toLocaleString();
  const label =
    delta <= 0
      ? `Results were due at ${when}`
      : `Next results expected ${when} (${Math.max(1, Math.round(delta / 60000))} min)`;

  return (
    <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
      {label}
    </p>
  );
}
