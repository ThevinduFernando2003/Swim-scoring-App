"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";

export function LastUpdated({ timestamp }: { timestamp: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="flex items-center gap-2 text-sm text-cream/70">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
      </span>
      Last updated {formatRelativeTime(new Date(timestamp), new Date(now))}
    </p>
  );
}
